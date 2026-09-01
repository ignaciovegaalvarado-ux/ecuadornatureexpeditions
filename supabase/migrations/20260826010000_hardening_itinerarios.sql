-- ============================================================================
-- HARDENING — Ecuador Nature Expeditions
--
-- Revisión de los dos esquemas anteriores (tarifario + itinerarios) con
-- criterio de ingeniería PostgreSQL. Todo lo que se corrige aquí fue
-- REPRODUCIDO contra un Postgres 16 real antes de escribirlo, no deducido.
--
-- Lo que NO se hace, y por qué:
--   · Particionado: la tabla más grande de este modelo son las tarifas
--     (~2.000 filas) y las instancias (cientos al año). El particionado
--     empieza a pagar a partir de ~100M filas; aquí sólo añadiría
--     complejidad de mantenimiento.
--   · Replicación, pgBouncer, tuning de autovacuum/shared_buffers: los
--     administra Supabase. No son del esquema.
--   · Migrar `char(n)` a `text`: la regla general existe porque `char` rellena
--     con espacios hasta el ancho fijo. Aquí cada columna (`moneda char(3)`,
--     `idioma char(2)`) guarda siempre exactamente esa longitud, así que el
--     relleno nunca ocurre y el cambio no altera ningún comportamiento. Costaba
--     recrear seis vistas dependientes a cambio de nada.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. RLS: TABLAS ACTIVADAS SIN POLÍTICA = DENEGADO TOTAL
--
-- BUG REAL, no teórico. `alter table ... enable row level security` sin una
-- sola política no protege: bloquea. 17 tablas de los dos esquemas quedaron
-- así. Verificado: con una fila insertada en `itinerario_inclusiones`, el rol
-- `authenticated` recibía 0 filas. La app leía el día pero no podía leer sus
-- inclusiones ni sus actividades.
--
-- Se completa el patrón "lectura autenticada" que ya traían los esquemas.
-- La escritura sigue pasando por el service role (que salta RLS), que es lo
-- coherente para un back office + n8n.
--
-- PENDIENTE DE PRODUCTO: `itinerarios_instancia` y sus hijas llevan datos de
-- cliente (nombre, email, país). "Todo autenticado lee todo" es un punto de
-- partida, no el destino: cuando existan los roles admin/coordinador/operador
-- de PRODUCT.md, estas políticas deben restringirse por rol.
-- ---------------------------------------------------------------------------

-- Del esquema de itinerarios
create policy "lectura autenticada" on itinerario_dia_actividades
  for select to authenticated using (true);
create policy "lectura autenticada" on itinerario_inclusiones
  for select to authenticated using (true);
create policy "lectura autenticada" on itinerario_suplementos_simple
  for select to authenticated using (true);
create policy "lectura autenticada" on instancia_dia_actividades
  for select to authenticated using (true);
create policy "lectura autenticada" on instancia_dia_hospedajes
  for select to authenticated using (true);
create policy "lectura autenticada" on instancia_inclusiones
  for select to authenticated using (true);
create policy "lectura autenticada" on staging_itinerarios_origen
  for select to authenticated using (true);

-- Del esquema tarifario (mismo defecto)
create policy "lectura autenticada" on proveedor_contactos
  for select to authenticated using (true);
create policy "lectura autenticada" on contratos_tarifa
  for select to authenticated using (true);
create policy "lectura autenticada" on tarifas_programa
  for select to authenticated using (true);
create policy "lectura autenticada" on tarifas_servicio
  for select to authenticated using (true);
create policy "lectura autenticada" on politicas_fiscales
  for select to authenticated using (true);
create policy "lectura autenticada" on politicas_ninos
  for select to authenticated using (true);
create policy "lectura autenticada" on politicas_cortesia
  for select to authenticated using (true);
create policy "lectura autenticada" on suplementos
  for select to authenticated using (true);
create policy "lectura autenticada" on restricciones_fecha
  for select to authenticated using (true);
create policy "lectura autenticada" on staging_tarifas_origen
  for select to authenticated using (true);


-- ---------------------------------------------------------------------------
-- 2. LAS VISTAS SE SALTABAN EL RLS
--
-- Una vista se ejecuta con los permisos de su DUEÑO, no de quien consulta.
-- Verificado: `authenticated` no podía leer `itinerario_inclusiones`
-- directamente, pero sí obtenía datos a través de una vista que la lee.
-- Es decir: toda política de RLS que se escriba a futuro sobre estas tablas
-- sería evitable consultando la vista.
--
-- `security_invoker` (PG15+) hace que la vista se evalúe con los permisos y
-- las políticas del que consulta, que es lo que se espera.
-- ---------------------------------------------------------------------------
alter view v_tarifas_hospedaje       set (security_invoker = true);
alter view v_itinerario_dias         set (security_invoker = true);
alter view v_itinerario_precios      set (security_invoker = true);
alter view v_itinerario_comidas      set (security_invoker = true);
alter view v_costo_alojamiento_dia   set (security_invoker = true);
alter view v_itinerarios_incompletos set (security_invoker = true);


-- ---------------------------------------------------------------------------
-- 3. CLAVES FORÁNEAS SIN ÍNDICE
--
-- Postgres no indexa el lado hijo de una FK automáticamente. Sin ese índice,
-- cada `delete` o `update` del padre hace un seq scan del hijo para validar
-- la acción referencial — y con `on delete cascade` eso se multiplica por la
-- profundidad del árbol.
--
-- Se indexan sólo las que se recorren de verdad: FKs con CASCADE/SET NULL/
-- RESTRICT hacia tablas que sí se borran, y columnas que se usan como join.
-- Se omiten a propósito las FKs contra catálogos inmutables (`ocupaciones`,
-- `planes_alimentacion`, `categorias_alojamiento`, `escalas_pax`): de esas
-- tablas nunca se borra una fila, así que el índice sería peso muerto en cada
-- insert sin ganancia de lectura.
-- ---------------------------------------------------------------------------

-- Itinerarios
create index on actividades                (bloque_texto_id);
create index on itinerarios_plantilla      (bloque_intro_id);
create index on itinerario_dias            (ubicacion_id);
create index on itinerario_dia_actividades (actividad_id);
create index on itinerario_dia_hospedajes  (bloque_texto_id);
create index on itinerario_inclusiones     (bloque_texto_id);
create index on staging_itinerarios_origen (plantilla_id);

-- Instancias
create index on instancia_dias             (origen_dia_id);
create index on instancia_dias             (ubicacion_id);
create index on instancia_dia_actividades  (actividad_id);
create index on instancia_dia_actividades  (origen_id);
create index on instancia_dia_hospedajes   (habitacion_id);
create index on instancia_dia_hospedajes   (tarifa_id);
create index on instancia_dia_hospedajes   (origen_id);
create index on instancia_inclusiones      (origen_id);

-- Tarifario: todas cuelgan de `contratos_tarifa` con on delete cascade.
-- Borrar un contrato vencido hacía seq scan de las seis.
create index on politicas_fiscales     (contrato_id);
create index on politicas_ninos        (contrato_id);
create index on politicas_cortesia     (contrato_id);
create index on suplementos            (contrato_id);
create index on restricciones_fecha    (contrato_id);
create index on tarifas_programa       (contrato_id);
create index on tarifas_servicio       (contrato_id);
create index on proveedor_amenities    (amenity_id);
create index on staging_tarifas_origen (proveedor_id);
create index on tarifas_hospedaje      (temporada_id);
create index on tarifas_programa       (temporada_id);
create index on tarifas_servicio       (temporada_id);


-- ---------------------------------------------------------------------------
-- 4. BUG: DOS HOTELES PREDETERMINADOS EN LA MISMA CATEGORÍA
--
-- `instanciar_itinerario` copia los hospedajes con `es_predeterminado`. Nada
-- impedía marcar dos hoteles como predeterminados para (día, 3*), y entonces
-- la instancia salía con el cliente alojado en dos hoteles la misma noche.
-- Verificado: se reprodujo con Cultura Manor + Vieja Cuba, ambos 3*.
--
-- Un índice único parcial lo vuelve imposible sin estorbar a las alternativas
-- (`es_predeterminado = false`), que sí pueden ser varias.
-- ---------------------------------------------------------------------------
create unique index itinerario_dia_hospedaje_default_uk
  on itinerario_dia_hospedajes (dia_id, categoria_codigo)
  where es_predeterminado;

-- La misma actividad no puede ir dos veces en un día. La restricción original
-- incluía `orden`, con lo que admitía duplicados con sólo cambiar el número.
alter table itinerario_dia_actividades
  drop constraint itinerario_dia_actividades_dia_id_actividad_id_orden_key;
alter table itinerario_dia_actividades
  add constraint itinerario_dia_actividades_dia_actividad_uk
  unique (dia_id, actividad_id);


-- ---------------------------------------------------------------------------
-- 5. INTEGRIDAD DE FAMILIA DE CATEGORÍA
--
-- `familia_categoria` en la plantilla y `familia` en el catálogo eran texto
-- libre sin relación entre sí. Verificado: se pudo cargar una plantilla
-- CONTINENTAL con una tarifa en FIRST_CLASS (familia GALAPAGOS) sin error.
-- En la práctica eso es un itinerario continental con precios de Galápagos
-- mezclados en la misma matriz — el tipo de dato sucio que este modelo existe
-- para evitar.
--
-- Un único disparador compartido valida las cuatro tablas que referencian
-- categorías, siguiendo el patrón de `chk_hospedaje_habitacion_coherente`.
-- ---------------------------------------------------------------------------

-- Primero, que la familia de la plantilla sea un valor conocido.
alter table itinerarios_plantilla
  add constraint itinerarios_plantilla_familia_ck
  check (familia_categoria in ('CONTINENTAL', 'GALAPAGOS'));

create or replace function chk_categoria_familia_coherente() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_familia_plantilla text;
  v_familia_categoria text;
  v_plantilla_id      uuid;
begin
  -- La plantilla se alcanza directo o a través del día, según la tabla.
  if tg_table_name = 'itinerario_dia_hospedajes' then
    select d.plantilla_id into v_plantilla_id
    from itinerario_dias d where d.id = new.dia_id;
  else
    v_plantilla_id := new.plantilla_id;
  end if;

  select familia_categoria into v_familia_plantilla
  from itinerarios_plantilla where id = v_plantilla_id;

  select familia into v_familia_categoria
  from categorias_alojamiento where codigo = new.categoria_codigo;

  if v_familia_categoria is distinct from v_familia_plantilla then
    raise exception
      'Categoría % (familia %) no aplica a esta plantilla (familia %)',
      new.categoria_codigo, v_familia_categoria, v_familia_plantilla;
  end if;
  return new;
end $$;

create trigger trg_tarifa_familia_coherente
  before insert or update on itinerario_tarifas
  for each row execute function chk_categoria_familia_coherente();

create trigger trg_suplemento_familia_coherente
  before insert or update on itinerario_suplementos_simple
  for each row execute function chk_categoria_familia_coherente();

create trigger trg_hospedaje_familia_coherente
  before insert or update on itinerario_dia_hospedajes
  for each row execute function chk_categoria_familia_coherente();


-- ---------------------------------------------------------------------------
-- 6. BUG: INSTANCIAR SIN CATEGORÍA DUPLICABA EL ALOJAMIENTO
--
-- El filtro era `p_categoria_codigo is null or h.categoria_codigo = ...`.
-- Verificado: llamando sin categoría, una plantilla con 3 categorías generaba
-- 3 hoteles para la misma noche en la instancia — y el coordinador no tiene
-- forma de saber cuál es el bueno.
--
-- La categoría es estructural: define el hotel Y el precio. Se exige.
-- Se añade además `set search_path`, que es obligatorio en cualquier función
-- que vaya a ejecutarse desde la API de Supabase.
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
language plpgsql
set search_path = public, pg_temp
as $$
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

  if p_categoria_codigo is null then
    raise exception
      'Se requiere categoría de alojamiento: determina el hotel de cada noche y el precio';
  end if;

  -- La categoría tiene que ser de la familia de esta plantilla.
  if not exists (
    select 1 from categorias_alojamiento
    where codigo = p_categoria_codigo
      and familia = v_plantilla.familia_categoria
  ) then
    raise exception 'Categoría % no aplica a la plantilla % (familia %)',
      p_categoria_codigo, v_plantilla.codigo, v_plantilla.familia_categoria;
  end if;

  v_anio := coalesce(p_anio, extract(year from coalesce(p_fecha_inicio, current_date))::int);

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
    and h.categoria_codigo = p_categoria_codigo;

  insert into instancia_inclusiones (instancia_id, incluido, texto, orden, origen_id)
  select v_instancia_id, i.incluido, i.texto, i.orden, i.id
  from itinerario_inclusiones i
  where i.plantilla_id = p_plantilla_id;

  return v_instancia_id;
end $$;

-- El disparador de coherencia habitación/proveedor tampoco fijaba search_path.
create or replace function chk_hospedaje_habitacion_coherente() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
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

create or replace function set_updated_at() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end $$;


-- ---------------------------------------------------------------------------
-- 7. BÚSQUEDA DE TEXTO COMPLETO SOBRE LA BIBLIOTECA
--
-- La biblioteca de bloques es el activo central del modelo: es donde el
-- coordinador va a buscar "el párrafo de Otavalo" o "el que menciona el
-- Pachamanca" para reutilizarlo al armar un itinerario nuevo. Con `ilike '%…%'`
-- eso es un seq scan del cuerpo completo de los 10 documentos.
--
-- Columna generada + índice GIN: se mantiene sola en cada insert/update y
-- resuelve la búsqueda por índice. La configuración lingüística sigue al
-- idioma de la fila, porque los documentos están en inglés pero el back
-- office es en español.
-- ---------------------------------------------------------------------------
alter table bloques_texto add column busqueda tsvector
  generated always as (
    to_tsvector(
      case idioma when 'es' then 'spanish'::regconfig else 'english'::regconfig end,
      coalesce(titulo, '') || ' ' || coalesce(cuerpo, '')
    )
  ) stored;

create index bloques_texto_busqueda_gin on bloques_texto using gin (busqueda);

-- Buscar en la biblioteca respetando el idioma de cada bloque.
--   select * from buscar_bloques('pachamanca');
create or replace function buscar_bloques(p_consulta text, p_idioma char(2) default null)
returns table (
  id       uuid,
  codigo   text,
  tipo     tipo_bloque_texto,
  titulo   text,
  extracto text,
  rango    real
)
language sql stable
set search_path = public, pg_temp
as $$
  select b.id, b.codigo, b.tipo, b.titulo,
         ts_headline(
           case b.idioma when 'es' then 'spanish'::regconfig else 'english'::regconfig end,
           b.cuerpo,
           websearch_to_tsquery(
             case b.idioma when 'es' then 'spanish'::regconfig else 'english'::regconfig end,
             p_consulta)),
         ts_rank(b.busqueda,
           websearch_to_tsquery(
             case b.idioma when 'es' then 'spanish'::regconfig else 'english'::regconfig end,
             p_consulta))
  from bloques_texto b
  where b.activo
    and (p_idioma is null or b.idioma = p_idioma)
    and b.busqueda @@ websearch_to_tsquery(
          case b.idioma when 'es' then 'spanish'::regconfig else 'english'::regconfig end,
          p_consulta)
  order by 6 desc;
$$;
