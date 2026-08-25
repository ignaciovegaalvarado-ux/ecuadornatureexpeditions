-- ============================================================================
-- ESQUEMA TARIFARIO — Ecuador Nature Expeditions
-- Modelo en estrella para catálogo de proveedores, habitaciones y tarifas.
--
-- Origen de los datos: libro Excel "Tarifas Hoteles" (8 hojas, 20 layouts de
-- encabezado distintos, ~285 entidades, ~2.080 celdas de precio) + documento
-- "Hoteles Foto" (descripciones e imágenes).
--
-- Se cargan primero en `staging_tarifas_origen` sin transformar, y desde ahí
-- se promueven a las dimensiones y hechos de este esquema.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------------

create type tipo_proveedor as enum (
  'HOTEL', 'HACIENDA', 'LODGE', 'HOSTERIA', 'RESTAURANTE',
  'BARCO', 'OPERADOR', 'TRANSPORTE', 'OTRO'
);

-- La distinción más importante de todo el modelo: si el precio se multiplica
-- por noches o por (noches x pasajeros). En el Excel sólo aparece en el texto
-- libre de OBSERVACIONES ("por habitación" vs "por pax"), y en muchas filas
-- no aparece en absoluto.
create type base_tarifa as enum ('POR_HABITACION', 'POR_PERSONA');

create type base_cargo as enum (
  'POR_HABITACION_NOCHE', 'POR_PERSONA_NOCHE', 'POR_ESTADIA', 'POR_PERSONA'
);

create type categoria_habitacion as enum (
  'ESTANDAR', 'SUPERIOR', 'DELUXE', 'JR_SUITE', 'SUITE',
  'SUITE_PRESIDENCIAL', 'FAMILIAR', 'CABANA', 'BUNGALOW', 'LOFT', 'OTRO'
);

create type tipo_tarifa as enum ('NETA', 'RACK', 'CONFIDENCIAL');
create type estado_contrato as enum ('BORRADOR', 'VIGENTE', 'VENCIDO', 'ANULADO');

create type tipo_servicio as enum (
  'DESAYUNO', 'ALMUERZO', 'CENA', 'BOX_LUNCH', 'ENTRADA',
  'TRANSFER', 'DAY_USE', 'SPA', 'ACTIVIDAD', 'GUIANZA', 'OTRO'
);

create type segmento_pax as enum (
  'ADULTO', 'NINO', 'INFANTE', 'GUIA', 'CHOFER', 'TOUR_LEADER'
);

create type rol_cortesia as enum ('GUIA', 'CHOFER', 'TOUR_LEADER');

create type tipo_beneficio as enum (
  'GRATIS', 'PORCENTAJE_DESCUENTO', 'PRECIO_FIJO',
  'PAGA_SOLO_DESAYUNO', 'TARIFA_ADULTO'
);

create type tipo_suplemento as enum (
  'EARLY_CHECKIN', 'LATE_CHECKOUT', 'DAY_USE', 'NAVIDAD', 'FIN_ANIO',
  'FERIADO', 'TEMPORADA_ALTA', 'VISTA_MAR', 'PAX_ADICIONAL',
  'CAMA_EXTRA', 'MASCOTA', 'OTRO'
);

create type modo_valor as enum ('MONTO_FIJO', 'PORCENTAJE');

create type tipo_restriccion as enum (
  'NO_APLICA_TARIFA', 'CERRADO', 'MINIMO_NOCHES', 'SOLO_GRUPOS'
);

create type estado_revision as enum ('PENDIENTE', 'REVISADO', 'DESCARTADO');


-- ---------------------------------------------------------------------------
-- 1. DIMENSIONES
-- ---------------------------------------------------------------------------

-- 1.1 Geografía. Reemplaza las hojas (NORTE, COSTA, GALAPAGOS...) y los
--     sub-bloques por provincia que hoy son sólo filas de título en el Excel.
create table ubicaciones (
  id            uuid primary key default gen_random_uuid(),
  pais          text not null default 'Ecuador',
  region        text,                  -- Sierra Norte, Costa, Galápagos, Amazonía, Bosque Nublado
  provincia     text,                  -- Pichincha, Imbabura, Cotopaxi, Galápagos...
  ciudad        text,                  -- Quito, Otavalo, Puerto Ayora
  zona          text,                  -- Centro Histórico, Aeropuerto, Puembo
  latitud       numeric(10,7),
  longitud      numeric(10,7),
  created_at    timestamptz not null default now(),
  unique (pais, region, provincia, ciudad, zona)
);

-- 1.2 Proveedor: la entidad maestra. Hoteles, restaurantes, lodges, barcos y
--     operadores comparten tabla porque comparten contactos, contratos y
--     políticas fiscales; se diferencian por `tipo`.
create table proveedores (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique,   -- slug estable: 'casa-gangotena'
  nombre            text not null,          -- nombre limpio, sin "iva 0%" ni "temporada baja"
  nombre_excel      text,                   -- nombre crudo como aparece en el Excel (trazabilidad)
  tipo              tipo_proveedor not null default 'HOTEL',
  ubicacion_id      uuid references ubicaciones(id) on delete set null,
  categoria         text,                   -- '5*', 'First Class', 'Boutique', 'Tourist Superior'
  sitio_web         text,
  telefono          text,
  activo            boolean not null default true,
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on proveedores (tipo);
create index on proveedores (ubicacion_id);

-- 1.3 Contactos. En el Excel llegan hasta 3 correos en una sola celda.
create table proveedor_contactos (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references proveedores(id) on delete cascade,
  nombre        text,
  cargo         text,
  email         text,
  telefono      text,
  es_principal  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on proveedor_contactos (proveedor_id);

-- 1.4 Descripciones (documento "Hoteles Foto", texto en inglés).
create table proveedor_descripciones (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references proveedores(id) on delete cascade,
  idioma        char(2) not null default 'en',
  descripcion   text not null,
  fuente        text,
  actualizado_en timestamptz not null default now(),
  unique (proveedor_id, idioma)
);

-- 1.5 Imágenes. Las 149 imágenes vienen embebidas en base64 en el .md:
--     se suben a Supabase Storage y aquí sólo se guarda la ruta.
create table proveedor_imagenes (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references proveedores(id) on delete cascade,
  storage_path  text not null,          -- bucket/objeto en Supabase Storage
  titulo        text,
  formato       text,                   -- jpeg | png
  ancho         int,
  alto          int,
  orden         int not null default 0,
  es_principal  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on proveedor_imagenes (proveedor_id, orden);

-- 1.6 Amenities (extraíbles de las descripciones: piscina, spa, wifi...).
create table amenities (
  id        uuid primary key default gen_random_uuid(),
  codigo    text not null unique,
  nombre    text not null,
  categoria text
);

create table proveedor_amenities (
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  amenity_id   uuid not null references amenities(id)   on delete cascade,
  primary key (proveedor_id, amenity_id)
);

-- 1.7 Habitaciones. Los nombres son propios de cada hotel ("Suite Junín",
--     "Wayra Room"), por eso cuelgan del proveedor; `categoria` permite
--     comparar entre hoteles. `num_unidades` captura el "(34)" de
--     "Premium (34)" que hoy va dentro del nombre.
create table habitaciones (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references proveedores(id) on delete cascade,
  nombre        text not null,
  categoria     categoria_habitacion not null default 'ESTANDAR',
  capacidad_max int,
  num_unidades  int,
  descripcion   text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (proveedor_id, nombre)
);
create index on habitaciones (proveedor_id);

-- 1.8 Ocupación: las columnas SENCILLA/DOBLE/TRIPLE/CUÁDRUPLE del Excel
--     pasan a ser filas (unpivot).
create table ocupaciones (
  codigo  text primary key,             -- SGL, DBL, TPL, CPL, QPL
  nombre  text not null,
  num_pax int  not null
);
insert into ocupaciones (codigo, nombre, num_pax) values
  ('SGL','Sencilla',1), ('DBL','Doble',2), ('TPL','Triple',3),
  ('CPL','Cuádruple',4), ('QPL','Quíntuple',5);

-- 1.9 Plan de alimentación. En el Excel aparece mezclado como si fuera un
--     tipo de habitación ("B&B" vs "MAP" en Cabañas del Lago, "FAP" en Kapari).
create table planes_alimentacion (
  codigo            text primary key,   -- SA, BB, MAP, FAP, AI
  nombre            text not null,
  incluye_desayuno  boolean not null default false,
  incluye_almuerzo  boolean not null default false,
  incluye_cena      boolean not null default false
);
insert into planes_alimentacion values
  ('SA', 'Sólo alojamiento', false, false, false),
  ('BB', 'Alojamiento y desayuno', true,  false, false),
  ('MAP','Media pensión',          true,  false, true ),
  ('FAP','Pensión completa',       true,  true,  true ),
  ('AI', 'Todo incluido',          true,  true,  true );

-- 1.10 Temporadas. `prioridad` resuelve solapamientos: un feriado (100) gana
--      sobre temporada alta (50), que gana sobre baja (10).
create table temporadas (
  id                uuid primary key default gen_random_uuid(),
  proveedor_id      uuid references proveedores(id) on delete cascade, -- null = global
  codigo            text not null,      -- TB, TA, FERIADO, NAVIDAD, FIN_ANIO
  nombre            text not null,
  fecha_inicio      date not null,
  fecha_fin         date not null,
  recurrente_anual  boolean not null default false,
  prioridad         int not null default 10,
  created_at        timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);
create index on temporadas (proveedor_id, fecha_inicio, fecha_fin);

-- 1.11 Contrato tarifario: da vigencia y versionado. Permite que 2026 y 2027
--      convivan sin pisarse, que es justo lo que el Excel no puede hacer.
create table contratos_tarifa (
  id              uuid primary key default gen_random_uuid(),
  proveedor_id    uuid not null references proveedores(id) on delete cascade,
  anio            int,
  fecha_desde     date not null,
  fecha_hasta     date not null,
  moneda          char(3) not null default 'USD',
  tipo            tipo_tarifa not null default 'NETA',
  es_comisionable boolean not null default false,
  comision_pct    numeric(5,4),         -- 0.1500 = 15%
  estado          estado_contrato not null default 'BORRADOR',
  documento_url   text,
  notas           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (fecha_hasta >= fecha_desde),
  check (comision_pct is null or (comision_pct >= 0 and comision_pct <= 1))
);
create index on contratos_tarifa (proveedor_id, fecha_desde, fecha_hasta);


-- ---------------------------------------------------------------------------
-- 2. HECHOS
-- ---------------------------------------------------------------------------

-- 2.1 HECHO PRINCIPAL — tarifa de hospedaje por noche.
--
-- Grano: un precio para (habitación x ocupación x plan x temporada x escala
-- de volumen), dentro de un contrato vigente.
--
-- Las ~2.080 celdas de precio del Excel aterrizan aquí como filas.
create table tarifas_hospedaje (
  id                  uuid primary key default gen_random_uuid(),
  contrato_id         uuid not null references contratos_tarifa(id) on delete cascade,
  proveedor_id        uuid not null references proveedores(id) on delete cascade,
  habitacion_id       uuid not null references habitaciones(id)  on delete cascade,
  ocupacion_codigo    text not null references ocupaciones(codigo),
  plan_codigo         text not null references planes_alimentacion(codigo) default 'BB',
  temporada_id        uuid references temporadas(id) on delete set null,

  -- Sin esto no se puede cotizar: define si el precio se multiplica por
  -- noches o por (noches x pax).
  base                base_tarifa not null,

  precio              numeric(10,2) not null check (precio >= 0),
  impuestos_incluidos boolean not null default false,

  -- Escalas por volumen: "1-5 hab.", "6-10 hab.", "11 hab en adelante",
  -- "1-4 pax", "5-10 pax", "FIT" vs "GRUPOS (+16)". 112 casos en el Excel.
  pax_min             int,
  pax_max             int,
  habitaciones_min    int,
  habitaciones_max    int,

  noches_min          int,              -- "mínimo 2 noches consecutivas"

  observaciones       text,             -- texto original de OBSERVACIONES (trazabilidad)
  origen_id           uuid,             -- fila de staging que la generó
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  check (pax_max is null or pax_min is null or pax_max >= pax_min),
  check (habitaciones_max is null or habitaciones_min is null
         or habitaciones_max >= habitaciones_min)
);
create unique index tarifas_hospedaje_grano_uk on tarifas_hospedaje (
  contrato_id, habitacion_id, ocupacion_codigo, plan_codigo,
  coalesce(temporada_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(pax_min, -1), coalesce(habitaciones_min, -1)
);
create index on tarifas_hospedaje (proveedor_id);
create index on tarifas_hospedaje (habitacion_id);

-- 2.2 Programas multi-día: lodges de Amazonía ("4D/3N") y barcos de Galápagos
--     ("5D", "8D"). Grano distinto al de hospedaje por noche: el precio es del
--     paquete completo, no por noche. Por eso va en su propia tabla en lugar
--     de forzarlo dentro de la anterior (que es el error del Excel actual).
create table tarifas_programa (
  id                    uuid primary key default gen_random_uuid(),
  contrato_id           uuid not null references contratos_tarifa(id) on delete cascade,
  proveedor_id          uuid not null references proveedores(id) on delete cascade,
  nombre_programa       text not null,          -- '4D/3N', 'BIRDING 5D'
  dias                  int,
  noches                int,
  ocupacion_codigo      text references ocupaciones(codigo),
  categoria_cabina      text,                   -- Standard, Deluxe, Suite, Wayra Room
  temporada_id          uuid references temporadas(id) on delete set null,

  precio_por_pax        numeric(10,2) not null check (precio_por_pax >= 0),
  impuestos_incluidos   boolean not null default false,

  dias_salida           text[],                 -- {'lun','mie','vie'}
  incluye_tkt           boolean not null default false,
  precio_tkt            numeric(10,2),          -- vuelo Quito/Coca, ticket Galápagos
  precio_entrada_parque numeric(10,2),
  comision_pct          numeric(5,4),
  observaciones         text,
  origen_id             uuid,
  created_at            timestamptz not null default now()
);
create index on tarifas_programa (proveedor_id);

-- 2.3 Servicios sueltos: alimentación (DESAYUNO/ALMUERZO/BL/CENA), entradas,
--     transfers, day use. Incluye las tarifas de la hoja RESTAURANTE.
create table tarifas_servicio (
  id                  uuid primary key default gen_random_uuid(),
  contrato_id         uuid references contratos_tarifa(id) on delete cascade,
  proveedor_id        uuid not null references proveedores(id) on delete cascade,
  tipo                tipo_servicio not null,
  variante            text,                     -- '2 tiempos', '3 tiempos', 'buffet'
  segmento            segmento_pax not null default 'ADULTO',
  temporada_id        uuid references temporadas(id) on delete set null,
  precio              numeric(10,2) not null check (precio >= 0),
  impuestos_incluidos boolean not null default false,
  pax_min             int,
  pax_max             int,
  observaciones       text,
  origen_id           uuid,
  created_at          timestamptz not null default now()
);
create index on tarifas_servicio (proveedor_id, tipo);


-- ---------------------------------------------------------------------------
-- 3. POLÍTICAS — lo que hoy vive sepultado en la columna OBSERVACIONES
-- ---------------------------------------------------------------------------

-- 3.1 Política fiscal. Reemplaza los 82 "+25%", 117 "+IVA", 22 "tasa
--     municipal", 5 "seguro hotelero" y 5 "carbono" del texto libre.
--     Nota: "+25%" NO es un impuesto único; es 15% IVA + 10% servicio, y hay
--     que guardarlo descompuesto para poder recalcular si el IVA cambia.
create table politicas_fiscales (
  id                          uuid primary key default gen_random_uuid(),
  proveedor_id                uuid not null references proveedores(id) on delete cascade,
  contrato_id                 uuid references contratos_tarifa(id) on delete cascade,
  iva_pct                     numeric(5,4) not null default 0.15,
  servicio_pct                numeric(5,4) not null default 0,
  aplica_iva_cero_extranjeros boolean not null default false,
  tasa_municipal_valor        numeric(6,2),
  tasa_municipal_base         base_cargo,
  seguro_valor                numeric(6,2),
  seguro_base                 base_cargo,
  tasa_carbono_valor          numeric(6,2),
  tasa_carbono_base           base_cargo,
  vigente_desde               date,
  vigente_hasta               date,
  observaciones               text,
  created_at                  timestamptz not null default now()
);
create index on politicas_fiscales (proveedor_id);

-- 3.2 Política de niños (33 variantes distintas en el Excel).
create table politicas_ninos (
  id                      uuid primary key default gen_random_uuid(),
  proveedor_id            uuid not null references proveedores(id) on delete cascade,
  contrato_id             uuid references contratos_tarifa(id) on delete cascade,
  edad_min                int not null default 0,
  edad_max                int not null,
  tipo                    tipo_beneficio not null,
  valor                   numeric(10,2),          -- % (0.50) o monto fijo según `tipo`
  requiere_compartir_cama boolean not null default false,
  max_ninos               int,
  observaciones           text,
  check (edad_max >= edad_min)
);
create index on politicas_ninos (proveedor_id);

-- 3.3 Gratuidades y descuentos de guía / chofer / tour leader.
--     Ej: "1-5 pax 20% dsct, a partir de 6 pax 50%", "+10 pax guía free".
create table politicas_cortesia (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references proveedores(id) on delete cascade,
  contrato_id   uuid references contratos_tarifa(id) on delete cascade,
  rol           rol_cortesia not null,
  pax_min       int,
  pax_max       int,
  tipo          tipo_beneficio not null,
  valor         numeric(10,2),
  aplica_a      text not null default 'AMBOS',    -- HOSPEDAJE | ALIMENTACION | AMBOS
  observaciones text
);
create index on politicas_cortesia (proveedor_id);

-- 3.4 Suplementos y recargos (62 menciones de Navidad/fin de año, 18 de
--     early/late check, 14 de day use).
create table suplementos (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references proveedores(id) on delete cascade,
  contrato_id   uuid references contratos_tarifa(id) on delete cascade,
  tipo          tipo_suplemento not null,
  modo          modo_valor not null,
  valor         numeric(10,2) not null,
  base          base_cargo not null default 'POR_HABITACION_NOCHE',
  fecha_desde   date,
  fecha_hasta   date,
  observaciones text
);
create index on suplementos (proveedor_id);

-- 3.5 Restricciones de fecha: "no aplica feriados" (13 casos), "no aplica del
--     24 dic 2026 ni del 29 dic al 1 ene", "mínimo 3 noches".
create table restricciones_fecha (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references proveedores(id) on delete cascade,
  contrato_id   uuid references contratos_tarifa(id) on delete cascade,
  tipo          tipo_restriccion not null,
  fecha_inicio  date not null,
  fecha_fin     date not null,
  noches_min    int,
  motivo        text,
  check (fecha_fin >= fecha_inicio)
);
create index on restricciones_fecha (proveedor_id, fecha_inicio, fecha_fin);


-- ---------------------------------------------------------------------------
-- 4. STAGING — aterrizaje crudo del Excel
--
-- Se importa cada fila tal cual, sin interpretar. Permite reprocesar el
-- parseo las veces que haga falta sin volver al Excel, y deja un rastro
-- auditable de qué fila original generó cada tarifa.
-- ---------------------------------------------------------------------------
create table staging_tarifas_origen (
  id                uuid primary key default gen_random_uuid(),
  hoja              text not null,       -- NORTE, GALAPAGOS, BARCOS...
  bloque            text,                -- "TARIFAS HOTELES IMBABURA"
  fila_numero       int,
  nombre_crudo      text,                -- puede venir vacío (celda combinada)
  nombre_propagado  text,                -- nombre heredado de la fila anterior
  columnas          jsonb not null,      -- fila completa como {encabezado: valor}
  observaciones     text,
  email             text,
  estado            estado_revision not null default 'PENDIENTE',
  proveedor_id      uuid references proveedores(id) on delete set null,
  notas_revision    text,
  importado_en      timestamptz not null default now()
);
create index on staging_tarifas_origen (hoja, estado);
create index on staging_tarifas_origen using gin (columnas);


-- ---------------------------------------------------------------------------
-- 5. VISTA DE CONSULTA — tarifa "aplanada" para el back office
-- ---------------------------------------------------------------------------
create view v_tarifas_hospedaje as
select
  t.id,
  p.nombre               as hotel,
  p.tipo                 as tipo_proveedor,
  u.provincia,
  u.ciudad,
  h.nombre               as habitacion,
  h.categoria            as categoria_habitacion,
  o.nombre               as ocupacion,
  o.num_pax,
  pa.nombre              as plan_alimentacion,
  ts.codigo              as temporada,
  t.base,
  t.precio,
  t.impuestos_incluidos,
  t.pax_min, t.pax_max,
  t.habitaciones_min, t.habitaciones_max,
  c.anio, c.fecha_desde, c.fecha_hasta, c.moneda,
  c.tipo                 as tipo_tarifa,
  c.es_comisionable, c.comision_pct,
  t.observaciones
from tarifas_hospedaje t
join proveedores          p  on p.id  = t.proveedor_id
join habitaciones         h  on h.id  = t.habitacion_id
join ocupaciones          o  on o.codigo = t.ocupacion_codigo
join planes_alimentacion  pa on pa.codigo = t.plan_codigo
join contratos_tarifa     c  on c.id  = t.contrato_id
left join ubicaciones     u  on u.id  = p.ubicacion_id
left join temporadas      ts on ts.id = t.temporada_id;


-- ---------------------------------------------------------------------------
-- 6. TRIGGERS DE AUDITORÍA
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_proveedores_updated
  before update on proveedores
  for each row execute function set_updated_at();

create trigger trg_contratos_updated
  before update on contratos_tarifa
  for each row execute function set_updated_at();

create trigger trg_tarifas_updated
  before update on tarifas_hospedaje
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 7. RLS
--
-- Datos comerciales sensibles (tarifas netas y confidenciales de proveedor):
-- se habilita RLS en todas las tablas. Las políticas concretas dependen del
-- modelo de roles de la aplicación, así que aquí sólo se activa y se deja una
-- política de lectura para usuarios autenticados como punto de partida.
-- ---------------------------------------------------------------------------
alter table proveedores            enable row level security;
alter table proveedor_contactos    enable row level security;
alter table habitaciones           enable row level security;
alter table contratos_tarifa       enable row level security;
alter table tarifas_hospedaje      enable row level security;
alter table tarifas_programa       enable row level security;
alter table tarifas_servicio       enable row level security;
alter table politicas_fiscales     enable row level security;
alter table politicas_ninos        enable row level security;
alter table politicas_cortesia     enable row level security;
alter table suplementos            enable row level security;
alter table restricciones_fecha    enable row level security;
alter table staging_tarifas_origen enable row level security;

create policy "lectura autenticada" on proveedores
  for select to authenticated using (true);
create policy "lectura autenticada" on habitaciones
  for select to authenticated using (true);
create policy "lectura autenticada" on tarifas_hospedaje
  for select to authenticated using (true);
