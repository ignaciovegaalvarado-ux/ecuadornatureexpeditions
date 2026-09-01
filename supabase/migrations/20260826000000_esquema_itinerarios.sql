-- ============================================================================
-- ESQUEMA DE ITINERARIOS — Ecuador Nature Expeditions
--
-- Continúa el ecosistema iniciado en 20260825000000_esquema_tarifario.sql:
-- allí vive la OFERTA (proveedores, habitaciones, tarifas negociadas); aquí
-- vive el PRODUCTO (los itinerarios que la agencia ya tiene armados) y la
-- VENTA (la copia editable que se genera al cotizar un viaje concreto).
--
-- Origen de los datos: 10 documentos de itinerario en Word/Markdown
-- (Andes, Birding East-West, Galápagos, Birding & Mammals, Chocolate,
-- Ecuador Andes N-S, Ecuadorian Flavors, Southern Endemics, Yoga 5 Elements…),
-- de 7 a 14 días cada uno, con matriz de precios por categoría de hotel x
-- tamaño de grupo x margen (25% / 30%).
--
-- Tres decisiones estructurales, que son las que este esquema resuelve:
--
--   1. EL TEXTO ES UNA BIBLIOTECA, NO UNA COPIA.
--      El mismo párrafo ("DAY 1: ARRIVAL TO QUITO", la descripción de San
--      Isidro Lodge, la visita al museo del Agave) se repite literalmente en
--      varios de los 10 documentos. Se guarda UNA vez en `bloques_texto` y los
--      días de cada itinerario lo referencian. Corregir una errata se hace en
--      un solo lugar.
--
--   2. EL ALOJAMIENTO SE ELIGE POR CATEGORÍA, CON DOS NIVELES DE PRECISIÓN.
--      Los documentos a veces dicen sólo el hotel ("San Isidro Lodge") y a
--      veces bajan a la habitación ("Cultura Manor — Standard: 3*, Suites:
--      3.5*/4*"). `itinerario_dia_hospedajes` admite los dos: `habitacion_id`
--      es opcional. Ese es el enganche real con el tarifario: con hotel +
--      habitación + categoría se puede ir a `tarifas_hospedaje` y costear.
--
--   3. PLANTILLA E INSTANCIA SON TABLAS DISTINTAS, NO UNA CON UN FLAG.
--      La plantilla es el catálogo que la agencia publica. La instancia es la
--      copia que se crea al vender y que el coordinador edita libremente. Se
--      copia entera (snapshot), no por diferencias: un itinerario ya vendido
--      no puede cambiar porque alguien editó la plantilla el mes siguiente.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------------

-- Qué clase de texto reutilizable es. `HOTEL` existe porque en los documentos
-- la ficha del hotel es un bloque narrativo propio, distinto de la descripción
-- comercial que ya guarda `proveedor_descripciones`.
create type tipo_bloque_texto as enum (
  'INTRO', 'DIA', 'ACTIVIDAD', 'HOTEL', 'INCLUYE', 'NO_INCLUYE', 'NOTA'
);

create type tipo_actividad as enum (
  'CITY_TOUR', 'CAMINATA', 'BIRDING', 'OBSERVACION_FAUNA', 'CABALGATA',
  'NAVEGACION', 'SNORKEL', 'VISITA_CULTURAL', 'MUSEO', 'MERCADO',
  'CLASE_COCINA', 'DEGUSTACION', 'COMUNIDAD', 'TERMAS', 'YOGA',
  'TREN', 'VUELO', 'TRANSFER', 'TIEMPO_LIBRE', 'OTRO'
);

-- Los 10 documentos se agrupan por gancho comercial; sirve para filtrar el
-- catálogo en el back office.
create type tema_itinerario as enum (
  'BIRDING', 'FAUNA', 'CULTURAL', 'CULINARIO', 'WELLNESS',
  'AVENTURA', 'GALAPAGOS', 'AMAZONIA', 'COMBINADO'
);

create type estado_itinerario as enum ('BORRADOR', 'PUBLICADO', 'ARCHIVADO');

create type estado_instancia as enum (
  'BORRADOR', 'COTIZADO', 'CONFIRMADO', 'OPERADO', 'CANCELADO'
);

-- Los documentos publican dos matrices idénticas en forma: "PRICE PER PERSON
-- 2027 IN USD – 25%" y "– 30%". No es temporada ni descuento: es el margen
-- comercial con el que se arma la venta.
create type margen_comercial as enum ('M25', 'M30');


-- ---------------------------------------------------------------------------
-- 1. BIBLIOTECA DE TEXTOS REUTILIZABLES
-- ---------------------------------------------------------------------------

-- 1.1 El bloque de texto: la unidad que el usuario llama "template".
--
--     Un mismo bloque lo usan varios itinerarios. `codigo` es el slug estable
--     con el que el importador de los .md deduplica ('dia-llegada-quito',
--     'hotel-san-isidro-lodge', 'actividad-museo-agave').
create table bloques_texto (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null,
  tipo          tipo_bloque_texto not null,
  idioma        char(2) not null default 'en',
  titulo        text,                   -- "ARRIVAL TO QUITO"
  cuerpo        text not null,          -- markdown
  -- Contexto opcional: permite ofrecer al coordinador "los bloques que
  -- existen para Otavalo" al editar un día.
  ubicacion_id  uuid references ubicaciones(id) on delete set null,
  proveedor_id  uuid references proveedores(id) on delete set null,
  version       int not null default 1,
  activo        boolean not null default true,
  notas         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (codigo, idioma)
);
create index on bloques_texto (tipo, idioma);
create index on bloques_texto (ubicacion_id);
create index on bloques_texto (proveedor_id);

-- 1.2 Catálogo de actividades. Lo que en el documento es una frase dentro del
--     párrafo del día ("visita al museo del Agave", "clase de cocina en San
--     Isidro") aquí es una entidad: se repite entre itinerarios, tiene costo,
--     tiene proveedor y entra o no en el bloque de INCLUDES.
create table actividades (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique,
  nombre            text not null,
  tipo              tipo_actividad not null default 'OTRO',
  ubicacion_id      uuid references ubicaciones(id) on delete set null,
  -- Quién la presta. Enlaza con el tarifario para costear entradas y guianza.
  proveedor_id      uuid references proveedores(id) on delete set null,
  bloque_texto_id   uuid references bloques_texto(id) on delete set null,
  duracion_horas    numeric(4,1),
  requiere_entrada  boolean not null default false,
  activo            boolean not null default true,
  notas             text,
  created_at        timestamptz not null default now()
);
create index on actividades (tipo);
create index on actividades (ubicacion_id);
create index on actividades (proveedor_id);


-- ---------------------------------------------------------------------------
-- 2. CATÁLOGOS DE LA MATRIZ DE PRECIOS
-- ---------------------------------------------------------------------------

-- 2.1 Categoría de alojamiento: las FILAS de la matriz de precios.
--
--     Ojo: no es una escala única. Los 9 itinerarios continentales usan
--     3* / 3.5* / 4*, pero el de Galápagos usa Tourist / Tourist Superior /
--     First Class. Por eso `familia` — y por eso `estrellas` es nullable.
create table categorias_alojamiento (
  codigo      text primary key,
  nombre      text not null,
  familia     text not null,            -- CONTINENTAL | GALAPAGOS
  estrellas   numeric(2,1),
  orden       int not null
);
insert into categorias_alojamiento (codigo, nombre, familia, estrellas, orden) values
  ('3',            '3***',             'CONTINENTAL', 3.0, 10),
  ('3.5',          '3.5***',           'CONTINENTAL', 3.5, 20),
  ('4',            '4****',            'CONTINENTAL', 4.0, 30),
  ('4.5',          '4.5****',          'CONTINENTAL', 4.5, 40),
  ('5',            '5*****',           'CONTINENTAL', 5.0, 50),
  ('TOURIST',      'Tourist',          'GALAPAGOS',   null, 10),
  ('TOURIST_SUP',  'Tourist Superior', 'GALAPAGOS',   null, 20),
  ('FIRST_CLASS',  'First Class',      'GALAPAGOS',   null, 30);

-- 2.2 Escala de pasajeros: las COLUMNAS de la matriz.
--
--     Idénticas en los 10 documentos. `pax_max` null = "16 PAX en adelante".
--     El rango explícito permite resolver por SQL a qué columna cae un grupo
--     de N pasajeros, en vez de que el coordinador la elija a ojo.
create table escalas_pax (
  codigo    text primary key,
  etiqueta  text not null,
  pax_min   int not null,
  pax_max   int,
  orden     int not null,
  check (pax_max is null or pax_max >= pax_min)
);
insert into escalas_pax (codigo, etiqueta, pax_min, pax_max, orden) values
  ('P1',    '1 PAX',     1,  1,    10),
  ('P2_3',  '2-3 PAX',   2,  3,    20),
  ('P4_5',  '4-5 PAX',   4,  5,    30),
  ('P6_9',  '6-9 PAX',   6,  9,    40),
  ('P10_11','10-11 PAX', 10, 11,   50),
  ('P12_15','12-15 PAX', 12, 15,   60),
  ('P16',   '16+ PAX',   16, null, 70);


-- ---------------------------------------------------------------------------
-- 3. PLANTILLA DE ITINERARIO — el producto que la agencia ya tiene armado
-- ---------------------------------------------------------------------------

-- 3.1 Cabecera. Un registro por documento.
create table itinerarios_plantilla (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,      -- 'ecuadorian-flavors'
  nombre              text not null,             -- 'Ecuadorian Flavors'
  subtitulo           text,
  idioma              char(2) not null default 'en',
  tema                tema_itinerario not null default 'CULTURAL',
  dias                int not null check (dias > 0),
  noches              int not null check (noches >= 0),
  -- Párrafo de apertura del documento. Va a la biblioteca como los demás.
  bloque_intro_id     uuid references bloques_texto(id) on delete set null,
  -- Qué familia de categorías aplica: decide si la matriz se pinta con
  -- 3*/3.5*/4* o con Tourist/Tourist Superior/First Class.
  familia_categoria   text not null default 'CONTINENTAL',
  -- "Itinerary subject to change based on local conditions."
  es_flexible         boolean not null default true,
  estado              estado_itinerario not null default 'BORRADOR',
  version             int not null default 1,
  documento_origen    text,                      -- nombre del .md importado
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (noches <= dias)
);
create index on itinerarios_plantilla (tema, estado);

-- 3.2 El día. Grano: un día del itinerario.
--
--     `titulo` se guarda aunque el bloque ya lo traiga, porque un mismo bloque
--     ("llegada a Quito") se titula distinto según el itinerario.
--     Las comidas son booleanos y no un texto "(B.L.D)": así se puede sumar
--     cuántos almuerzos hay que contratar sin parsear nada.
create table itinerario_dias (
  id                  uuid primary key default gen_random_uuid(),
  plantilla_id        uuid not null references itinerarios_plantilla(id) on delete cascade,
  numero_dia          int not null check (numero_dia > 0),
  titulo              text not null,
  bloque_texto_id     uuid references bloques_texto(id) on delete set null,
  -- Sólo se llena cuando este itinerario necesita apartarse del bloque
  -- compartido. Si es null, manda el bloque.
  texto_override      text,
  ubicacion_id        uuid references ubicaciones(id) on delete set null,

  incluye_desayuno    boolean not null default false,
  incluye_almuerzo    boolean not null default false,
  incluye_cena        boolean not null default false,
  incluye_box_lunch   boolean not null default false,

  -- Día de tránsito sin pernocte (el último día de casi todos los documentos:
  -- "transferencia al aeropuerto"). Evita buscarle hotel.
  sin_pernocte        boolean not null default false,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (plantilla_id, numero_dia)
);
create index on itinerario_dias (plantilla_id, numero_dia);
create index on itinerario_dias (bloque_texto_id);

-- 3.3 Actividades del día, en orden.
create table itinerario_dia_actividades (
  id              uuid primary key default gen_random_uuid(),
  dia_id          uuid not null references itinerario_dias(id) on delete cascade,
  actividad_id    uuid not null references actividades(id) on delete restrict,
  orden           int not null default 0,
  -- "In case that you are not interested on horseback riding you will visit
  -- the hacienda" — el documento ofrece alternativas reales.
  es_opcional     boolean not null default false,
  grupo_alternativa text,               -- mismas alternativas comparten valor
  notas           text,
  unique (dia_id, actividad_id, orden)
);
create index on itinerario_dia_actividades (dia_id, orden);

-- 3.4 ALOJAMIENTO DEL DÍA — el corazón del enganche con el tarifario.
--
--     Grano: una opción de hospedaje para (día x categoría). Un mismo día
--     puede tener 3 filas (una por categoría) o más, si hay hoteles
--     alternativos dentro de la misma categoría.
--
--     Los dos niveles de precisión que traen los documentos:
--
--       a) Con habitación:  Cultura Manor  → Standard = 3*, Suites = 3.5*/4*
--          ⇒ 3 filas, mismo `proveedor_id`, distinto `habitacion_id`.
--       b) Sin habitación:  San Isidro Lodge, sin desglose por tipo de cuarto
--          ⇒ 1 fila con `habitacion_id` null.
--
--     `nombre_libre` es el escape para el importador: si el hotel del .md
--     todavía no está en `proveedores`, se guarda el nombre crudo y la fila
--     queda pendiente de conciliar sin bloquear la carga.
create table itinerario_dia_hospedajes (
  id                  uuid primary key default gen_random_uuid(),
  dia_id              uuid not null references itinerario_dias(id) on delete cascade,
  categoria_codigo    text not null references categorias_alojamiento(codigo),

  proveedor_id        uuid references proveedores(id) on delete restrict,
  habitacion_id       uuid references habitaciones(id) on delete restrict,
  nombre_libre        text,

  -- Ficha narrativa del hotel tal como aparece en el documento.
  bloque_texto_id     uuid references bloques_texto(id) on delete set null,

  plan_codigo         text references planes_alimentacion(codigo),
  -- Cuando hay varios hoteles válidos en la misma categoría, éste es el que
  -- se propone por defecto al instanciar.
  es_predeterminado   boolean not null default true,
  orden               int not null default 0,
  notas               text,
  created_at          timestamptz not null default now(),

  -- O se referencia un proveedor del catálogo, o se deja el nombre crudo.
  check (proveedor_id is not null or nombre_libre is not null)
);
create index on itinerario_dia_hospedajes (dia_id, categoria_codigo);
create index on itinerario_dia_hospedajes (proveedor_id);
create index on itinerario_dia_hospedajes (habitacion_id);

-- La habitación tiene que pertenecer al hotel de la misma fila. Sin esto se
-- puede colar una suite de Cultura Manor bajo San Isidro Lodge.
create or replace function chk_hospedaje_habitacion_coherente() returns trigger
language plpgsql as $$
declare v_prov uuid;
begin
  if new.habitacion_id is null then
    return new;
  end if;
  if new.proveedor_id is null then
    raise exception 'habitacion_id requiere proveedor_id';
  end if;
  select proveedor_id into v_prov from habitaciones where id = new.habitacion_id;
  if v_prov is distinct from new.proveedor_id then
    raise exception 'La habitación % no pertenece al proveedor %',
      new.habitacion_id, new.proveedor_id;
  end if;
  return new;
end $$;

create trigger trg_hospedaje_habitacion_coherente
  before insert or update on itinerario_dia_hospedajes
  for each row execute function chk_hospedaje_habitacion_coherente();

-- 3.5 Bloques de INCLUDES / NOT INCLUDED, como líneas y no como un párrafo.
create table itinerario_inclusiones (
  id              uuid primary key default gen_random_uuid(),
  plantilla_id    uuid not null references itinerarios_plantilla(id) on delete cascade,
  incluido        boolean not null,      -- true = INCLUDES, false = NOT INCLUDED
  texto           text not null,
  bloque_texto_id uuid references bloques_texto(id) on delete set null,
  orden           int not null default 0
);
create index on itinerario_inclusiones (plantilla_id, incluido, orden);


-- ---------------------------------------------------------------------------
-- 4. PRECIOS PUBLICADOS DE LA PLANTILLA
--
-- Es el precio de venta que la agencia ya tiene decidido y que aparece en el
-- documento. No se calcula desde el tarifario: se guarda tal cual, porque es
-- el que se le muestra al cliente. El tarifario sirve para lo otro —
-- contrastar ese precio contra el costo real (ver `v_costo_alojamiento_dia`).
-- ---------------------------------------------------------------------------

-- 4.1 Una celda de la matriz. Grano: (plantilla x año x margen x categoría x
--     escala de pax). Para "Ecuadorian Flavors" son 2 x 3 x 7 = 42 filas.
create table itinerario_tarifas (
  id                  uuid primary key default gen_random_uuid(),
  plantilla_id        uuid not null references itinerarios_plantilla(id) on delete cascade,
  anio                int not null,
  margen              margen_comercial not null,
  categoria_codigo    text not null references categorias_alojamiento(codigo),
  escala_codigo       text not null references escalas_pax(codigo),
  moneda              char(3) not null default 'USD',
  precio_por_persona  numeric(10,2) not null check (precio_por_persona >= 0),
  vigente_desde       date,
  vigente_hasta       date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (plantilla_id, anio, margen, categoria_codigo, escala_codigo)
);
create index on itinerario_tarifas (plantilla_id, anio, margen);

-- 4.2 La columna "Sing Sup": es del par (categoría, margen), no de la escala
--     de pax, así que no cabe en la tabla anterior sin repetirla 7 veces.
create table itinerario_suplementos_simple (
  id                  uuid primary key default gen_random_uuid(),
  plantilla_id        uuid not null references itinerarios_plantilla(id) on delete cascade,
  anio                int not null,
  margen              margen_comercial not null,
  categoria_codigo    text not null references categorias_alojamiento(codigo),
  moneda              char(3) not null default 'USD',
  valor               numeric(10,2) not null check (valor >= 0),
  created_at          timestamptz not null default now(),
  unique (plantilla_id, anio, margen, categoria_codigo)
);


-- ---------------------------------------------------------------------------
-- 5. INSTANCIA — la copia editable que se crea al vender
--
-- Snapshot completo de la plantilla. Cada tabla guarda `origen_*_id` para
-- saber de dónde salió y `editado` para que la UI marque qué tocó el
-- coordinador, pero los datos son propios: la plantilla puede cambiar después
-- sin alterar un viaje ya cotizado.
-- ---------------------------------------------------------------------------

create table itinerarios_instancia (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text not null unique,      -- 'ENE-2027-0142'
  plantilla_id          uuid references itinerarios_plantilla(id) on delete set null,
  plantilla_version     int,                       -- versión copiada
  nombre                text not null,             -- editable; arranca del template

  cliente_nombre        text,
  cliente_email         text,
  cliente_pais          text,

  fecha_inicio          date,
  fecha_fin             date,
  num_pax               int check (num_pax > 0),
  num_pax_single        int not null default 0 check (num_pax_single >= 0),

  -- La combinación elegida en la matriz. Se guarda además del precio para
  -- poder explicar de dónde salió la cifra.
  categoria_codigo      text references categorias_alojamiento(codigo),
  margen                margen_comercial,
  escala_codigo         text references escalas_pax(codigo),

  moneda                char(3) not null default 'USD',
  precio_por_persona    numeric(10,2) check (precio_por_persona >= 0),
  suplemento_simple     numeric(10,2) check (suplemento_simple >= 0),
  -- Ajuste manual del vendedor sobre el precio de tarifario (+/-).
  ajuste_manual         numeric(10,2) not null default 0,

  estado                estado_instancia not null default 'BORRADOR',
  idioma                char(2) not null default 'en',
  notas_internas        text,
  creado_por            uuid,                      -- auth.users
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio)
);
create index on itinerarios_instancia (estado, fecha_inicio);
create index on itinerarios_instancia (plantilla_id);

create table instancia_dias (
  id                  uuid primary key default gen_random_uuid(),
  instancia_id        uuid not null references itinerarios_instancia(id) on delete cascade,
  numero_dia          int not null check (numero_dia > 0),
  fecha               date,                        -- fecha_inicio + numero_dia - 1
  titulo              text not null,
  -- El texto vive resuelto aquí (bloque o override ya aplicados): es el que se
  -- imprime en el documento del cliente y no debe moverse después.
  texto               text,
  origen_dia_id       uuid references itinerario_dias(id) on delete set null,
  ubicacion_id        uuid references ubicaciones(id) on delete set null,

  incluye_desayuno    boolean not null default false,
  incluye_almuerzo    boolean not null default false,
  incluye_cena        boolean not null default false,
  incluye_box_lunch   boolean not null default false,
  sin_pernocte        boolean not null default false,

  editado             boolean not null default false,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (instancia_id, numero_dia)
);
create index on instancia_dias (instancia_id, numero_dia);

create table instancia_dia_actividades (
  id                  uuid primary key default gen_random_uuid(),
  dia_id              uuid not null references instancia_dias(id) on delete cascade,
  actividad_id        uuid references actividades(id) on delete set null,
  nombre_libre        text,                        -- actividad añadida a mano
  orden               int not null default 0,
  confirmada          boolean not null default false,
  origen_id           uuid references itinerario_dia_actividades(id) on delete set null,
  notas               text,
  check (actividad_id is not null or nombre_libre is not null)
);
create index on instancia_dia_actividades (dia_id, orden);

-- El hospedaje ya resuelto: aquí la categoría ya se eligió, así que
-- normalmente hay una sola fila por día. Se conserva `categoria_codigo` para
-- casos de upgrade puntual en una noche concreta.
create table instancia_dia_hospedajes (
  id                  uuid primary key default gen_random_uuid(),
  dia_id              uuid not null references instancia_dias(id) on delete cascade,
  categoria_codigo    text references categorias_alojamiento(codigo),
  proveedor_id        uuid references proveedores(id) on delete restrict,
  habitacion_id       uuid references habitaciones(id) on delete restrict,
  nombre_libre        text,
  plan_codigo         text references planes_alimentacion(codigo),

  num_habitaciones    int check (num_habitaciones > 0),
  ocupacion_codigo    text references ocupaciones(codigo),
  -- Tarifa congelada al momento de cotizar. Sin esto, recotizar en enero da
  -- un número distinto al que firmó el cliente en noviembre.
  tarifa_id           uuid references tarifas_hospedaje(id) on delete set null,
  costo_unitario      numeric(10,2) check (costo_unitario >= 0),

  reservado           boolean not null default false,
  codigo_reserva      text,
  origen_id           uuid references itinerario_dia_hospedajes(id) on delete set null,
  notas               text,
  created_at          timestamptz not null default now(),
  check (proveedor_id is not null or nombre_libre is not null)
);
create index on instancia_dia_hospedajes (dia_id);
create index on instancia_dia_hospedajes (proveedor_id);

create trigger trg_instancia_hospedaje_habitacion_coherente
  before insert or update on instancia_dia_hospedajes
  for each row execute function chk_hospedaje_habitacion_coherente();

create table instancia_inclusiones (
  id            uuid primary key default gen_random_uuid(),
  instancia_id  uuid not null references itinerarios_instancia(id) on delete cascade,
  incluido      boolean not null,
  texto         text not null,
  orden         int not null default 0,
  origen_id     uuid references itinerario_inclusiones(id) on delete set null
);
create index on instancia_inclusiones (instancia_id, incluido, orden);


-- ---------------------------------------------------------------------------
-- 6. INSTANCIAR UNA PLANTILLA
--
-- Copia cabecera, días, actividades, hospedajes e inclusiones. Resuelve el
-- texto (override sobre bloque), filtra los hospedajes a la categoría pedida y
-- toma el precio de la matriz según el número de pasajeros.
-- ---------------------------------------------------------------------------

create or replace function instanciar_itinerario(
  p_plantilla_id     uuid,
  p_codigo           text,
  p_fecha_inicio     date    default null,
  p_num_pax          int     default null,
  p_categoria_codigo text    default null,
  p_margen           margen_comercial default 'M25',
  p_anio             int     default null,
  p_creado_por       uuid    default null
) returns uuid
language plpgsql as $$
declare
  v_instancia_id uuid;
  v_plantilla    itinerarios_plantilla%rowtype;
  v_escala       text;
  v_anio         int;
  v_precio       numeric(10,2);
  v_sup          numeric(10,2);
begin
  select * into v_plantilla from itinerarios_plantilla where id = p_plantilla_id;
  if not found then
    raise exception 'Plantilla % no existe', p_plantilla_id;
  end if;

  v_anio := coalesce(p_anio, extract(year from coalesce(p_fecha_inicio, current_date))::int);

  -- Escala de pax por rango, no por elección manual.
  select codigo into v_escala
  from escalas_pax
  where p_num_pax is not null
    and p_num_pax >= pax_min
    and (pax_max is null or p_num_pax <= pax_max);

  select precio_por_persona into v_precio
  from itinerario_tarifas
  where plantilla_id = p_plantilla_id
    and anio = v_anio
    and margen = p_margen
    and categoria_codigo = p_categoria_codigo
    and escala_codigo = v_escala;

  select valor into v_sup
  from itinerario_suplementos_simple
  where plantilla_id = p_plantilla_id
    and anio = v_anio
    and margen = p_margen
    and categoria_codigo = p_categoria_codigo;

  insert into itinerarios_instancia (
    codigo, plantilla_id, plantilla_version, nombre,
    fecha_inicio, fecha_fin, num_pax,
    categoria_codigo, margen, escala_codigo,
    precio_por_persona, suplemento_simple, idioma, creado_por
  ) values (
    p_codigo, p_plantilla_id, v_plantilla.version, v_plantilla.nombre,
    p_fecha_inicio,
    case when p_fecha_inicio is null then null
         else p_fecha_inicio + (v_plantilla.dias - 1) end,
    p_num_pax,
    p_categoria_codigo, p_margen, v_escala,
    v_precio, v_sup, v_plantilla.idioma, p_creado_por
  ) returning id into v_instancia_id;

  -- Días, con el texto ya resuelto.
  insert into instancia_dias (
    instancia_id, numero_dia, fecha, titulo, texto, origen_dia_id, ubicacion_id,
    incluye_desayuno, incluye_almuerzo, incluye_cena, incluye_box_lunch,
    sin_pernocte
  )
  select
    v_instancia_id, d.numero_dia,
    case when p_fecha_inicio is null then null
         else p_fecha_inicio + (d.numero_dia - 1) end,
    d.titulo,
    coalesce(d.texto_override, b.cuerpo),
    d.id, d.ubicacion_id,
    d.incluye_desayuno, d.incluye_almuerzo, d.incluye_cena, d.incluye_box_lunch,
    d.sin_pernocte
  from itinerario_dias d
  left join bloques_texto b on b.id = d.bloque_texto_id
  where d.plantilla_id = p_plantilla_id;

  insert into instancia_dia_actividades (dia_id, actividad_id, orden, origen_id, notas)
  select id_dia.id, a.actividad_id, a.orden, a.id, a.notas
  from itinerario_dia_actividades a
  join itinerario_dias od on od.id = a.dia_id
  join instancia_dias id_dia
    on id_dia.instancia_id = v_instancia_id
   and id_dia.numero_dia   = od.numero_dia
  where od.plantilla_id = p_plantilla_id
    and not a.es_opcional;

  -- Sólo la categoría contratada, y sólo la opción predeterminada.
  insert into instancia_dia_hospedajes (
    dia_id, categoria_codigo, proveedor_id, habitacion_id, nombre_libre,
    plan_codigo, origen_id, notas
  )
  select id_dia.id, h.categoria_codigo, h.proveedor_id, h.habitacion_id,
         h.nombre_libre, h.plan_codigo, h.id, h.notas
  from itinerario_dia_hospedajes h
  join itinerario_dias od on od.id = h.dia_id
  join instancia_dias id_dia
    on id_dia.instancia_id = v_instancia_id
   and id_dia.numero_dia   = od.numero_dia
  where od.plantilla_id = p_plantilla_id
    and h.es_predeterminado
    and (p_categoria_codigo is null or h.categoria_codigo = p_categoria_codigo);

  insert into instancia_inclusiones (instancia_id, incluido, texto, orden, origen_id)
  select v_instancia_id, i.incluido, i.texto, i.orden, i.id
  from itinerario_inclusiones i
  where i.plantilla_id = p_plantilla_id;

  return v_instancia_id;
end $$;


-- ---------------------------------------------------------------------------
-- 7. STAGING — aterrizaje crudo de los .md de itinerario
--
-- Mismo criterio que `staging_tarifas_origen`: el documento entra sin
-- interpretar y desde ahí se promueve, de modo que reparsear no obligue a
-- volver al Word original.
-- ---------------------------------------------------------------------------
create table staging_itinerarios_origen (
  id              uuid primary key default gen_random_uuid(),
  documento       text not null,           -- 'ecuador_flavors.md'
  seccion         text,                    -- DIA | HOTEL | PRECIOS | INCLUYE
  numero_dia      int,
  contenido       text,                    -- markdown crudo
  datos           jsonb,                   -- tablas parseadas
  estado          estado_revision not null default 'PENDIENTE',
  plantilla_id    uuid references itinerarios_plantilla(id) on delete set null,
  notas_revision  text,
  importado_en    timestamptz not null default now()
);
create index on staging_itinerarios_origen (documento, estado);
create index on staging_itinerarios_origen using gin (datos);


-- ---------------------------------------------------------------------------
-- 8. VISTAS
-- ---------------------------------------------------------------------------

-- 8.1 El itinerario día a día, con el texto ya resuelto y el código de comidas
--     reconstruido en el formato del documento ("(B.L.D)").
create view v_itinerario_dias as
select
  p.codigo                          as itinerario,
  p.nombre                          as itinerario_nombre,
  p.tema,
  d.id                              as dia_id,
  d.numero_dia,
  d.titulo,
  coalesce(d.texto_override, b.cuerpo) as texto,
  (d.texto_override is not null)    as texto_personalizado,
  u.ciudad,
  u.provincia,
  nullif(concat_ws('.',
    case when d.incluye_desayuno  then 'B'  end,
    case when d.incluye_almuerzo  then 'L'  end,
    case when d.incluye_cena      then 'D'  end,
    case when d.incluye_box_lunch then 'BL' end
  ), '')                            as comidas,
  d.sin_pernocte
from itinerario_dias d
join itinerarios_plantilla p on p.id = d.plantilla_id
left join bloques_texto b    on b.id = d.bloque_texto_id
left join ubicaciones  u     on u.id = d.ubicacion_id;

-- 8.2 La matriz de precios aplanada, como se ve en el documento.
create view v_itinerario_precios as
select
  p.codigo                 as itinerario,
  p.nombre                 as itinerario_nombre,
  t.anio,
  t.margen,
  c.nombre                 as categoria,
  c.orden                  as categoria_orden,
  e.etiqueta               as escala_pax,
  e.orden                  as escala_orden,
  e.pax_min, e.pax_max,
  t.moneda,
  t.precio_por_persona,
  s.valor                  as suplemento_simple
from itinerario_tarifas t
join itinerarios_plantilla  p on p.id = t.plantilla_id
join categorias_alojamiento c on c.codigo = t.categoria_codigo
join escalas_pax            e on e.codigo = t.escala_codigo
left join itinerario_suplementos_simple s
  on s.plantilla_id     = t.plantilla_id
 and s.anio             = t.anio
 and s.margen           = t.margen
 and s.categoria_codigo = t.categoria_codigo;

-- 8.3 EL PUENTE CON EL TARIFARIO.
--
--     Para cada noche de cada plantilla, el costo negociado con el hotel. Es
--     lo que permite contrastar el precio publicado (sección 4) contra lo que
--     realmente cuesta operar el itinerario, y detectar la plantilla cuyo
--     margen se evaporó porque el hotel subió su tarifa.
--
--     Cuando el documento no baja a la habitación (`habitacion_id` null), se
--     toma la tarifa más baja del hotel en esa ocupación como referencia.
create view v_costo_alojamiento_dia as
select
  p.codigo                 as itinerario,
  d.numero_dia,
  h.categoria_codigo,
  coalesce(pr.nombre, h.nombre_libre) as hotel,
  hab.nombre               as habitacion,
  (h.habitacion_id is null) as habitacion_sin_especificar,
  th.ocupacion_codigo,
  th.plan_codigo,
  th.base,
  min(th.precio)           as costo_noche,
  ct.anio                  as anio_contrato
from itinerario_dia_hospedajes h
join itinerario_dias d          on d.id = h.dia_id
join itinerarios_plantilla p    on p.id = d.plantilla_id
left join proveedores  pr       on pr.id  = h.proveedor_id
left join habitaciones hab      on hab.id = h.habitacion_id
left join tarifas_hospedaje th  on th.proveedor_id = h.proveedor_id
                               and (h.habitacion_id is null
                                    or th.habitacion_id = h.habitacion_id)
                               and (h.plan_codigo is null
                                    or th.plan_codigo = h.plan_codigo)
left join contratos_tarifa ct   on ct.id = th.contrato_id
                               and ct.estado = 'VIGENTE'
where not d.sin_pernocte
group by p.codigo, d.numero_dia, h.categoria_codigo, pr.nombre, h.nombre_libre,
         hab.nombre, h.habitacion_id, th.ocupacion_codigo, th.plan_codigo,
         th.base, ct.anio;

-- 8.4 Cuántas comidas hay que contratar por itinerario. Sale de los booleanos
--     del día; en el documento sólo existe como "(B.L)" suelto al pie.
create view v_itinerario_comidas as
select
  p.codigo                                        as itinerario,
  count(*) filter (where d.incluye_desayuno)      as desayunos,
  count(*) filter (where d.incluye_almuerzo)      as almuerzos,
  count(*) filter (where d.incluye_cena)          as cenas,
  count(*) filter (where d.incluye_box_lunch)     as box_lunches
from itinerario_dias d
join itinerarios_plantilla p on p.id = d.plantilla_id
group by p.codigo;


-- ---------------------------------------------------------------------------
-- 9. VALIDACIONES DE INTEGRIDAD DEL PRODUCTO
-- ---------------------------------------------------------------------------

-- Plantillas cuya cabecera dice N días pero no tienen N días cargados, o a las
-- que les falta el hospedaje de alguna categoría en alguna noche. Es la
-- revisión que hoy se hace leyendo el Word.
create view v_itinerarios_incompletos as
select
  p.codigo,
  p.nombre,
  p.dias                                       as dias_declarados,
  count(distinct d.id)                         as dias_cargados,
  count(distinct d.id) filter (
    where not d.sin_pernocte
      and not exists (select 1 from itinerario_dia_hospedajes h where h.dia_id = d.id)
  )                                            as noches_sin_hotel,
  count(distinct t.categoria_codigo)           as categorias_con_precio
from itinerarios_plantilla p
left join itinerario_dias   d on d.plantilla_id = p.id
left join itinerario_tarifas t on t.plantilla_id = p.id
group by p.codigo, p.nombre, p.dias
having p.dias <> count(distinct d.id)
    or count(distinct t.categoria_codigo) = 0
    or count(distinct d.id) filter (
         where not d.sin_pernocte
           and not exists (select 1 from itinerario_dia_hospedajes h where h.dia_id = d.id)
       ) > 0;


-- ---------------------------------------------------------------------------
-- 10. TRIGGERS DE AUDITORÍA
-- ---------------------------------------------------------------------------
create trigger trg_bloques_texto_updated
  before update on bloques_texto
  for each row execute function set_updated_at();

create trigger trg_itinerarios_plantilla_updated
  before update on itinerarios_plantilla
  for each row execute function set_updated_at();

create trigger trg_itinerario_dias_updated
  before update on itinerario_dias
  for each row execute function set_updated_at();

create trigger trg_itinerario_tarifas_updated
  before update on itinerario_tarifas
  for each row execute function set_updated_at();

create trigger trg_itinerarios_instancia_updated
  before update on itinerarios_instancia
  for each row execute function set_updated_at();

create trigger trg_instancia_dias_updated
  before update on instancia_dias
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 11. RLS
--
-- Mismo criterio que el esquema tarifario. La plantilla es catálogo interno;
-- la instancia lleva datos de cliente, así que es la más sensible de las dos.
-- ---------------------------------------------------------------------------
alter table bloques_texto                enable row level security;
alter table actividades                  enable row level security;
alter table itinerarios_plantilla        enable row level security;
alter table itinerario_dias              enable row level security;
alter table itinerario_dia_actividades   enable row level security;
alter table itinerario_dia_hospedajes    enable row level security;
alter table itinerario_inclusiones       enable row level security;
alter table itinerario_tarifas           enable row level security;
alter table itinerario_suplementos_simple enable row level security;
alter table itinerarios_instancia        enable row level security;
alter table instancia_dias               enable row level security;
alter table instancia_dia_actividades    enable row level security;
alter table instancia_dia_hospedajes     enable row level security;
alter table instancia_inclusiones        enable row level security;
alter table staging_itinerarios_origen   enable row level security;

create policy "lectura autenticada" on bloques_texto
  for select to authenticated using (true);
create policy "lectura autenticada" on actividades
  for select to authenticated using (true);
create policy "lectura autenticada" on itinerarios_plantilla
  for select to authenticated using (true);
create policy "lectura autenticada" on itinerario_dias
  for select to authenticated using (true);
create policy "lectura autenticada" on itinerario_dia_hospedajes
  for select to authenticated using (true);
create policy "lectura autenticada" on itinerario_tarifas
  for select to authenticated using (true);
create policy "lectura autenticada" on itinerarios_instancia
  for select to authenticated using (true);
create policy "lectura autenticada" on instancia_dias
  for select to authenticated using (true);
