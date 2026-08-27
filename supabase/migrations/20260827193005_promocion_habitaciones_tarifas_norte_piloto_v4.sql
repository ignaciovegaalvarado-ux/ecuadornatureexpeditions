-- ============================================================================
-- PILOTO Task 3 (v4, version final consolidada): promueve habitaciones +
-- tarifas_hospedaje desde staging_tarifas_origen para la hoja NORTE.
--
-- Esta es la version que quedo vigente despues de 3 rondas de correccion
-- sobre el intento inicial (ver 20260827191952_promocion_habitaciones_
-- tarifas_norte_piloto.sql). En la base remota estos pasos intermedios se
-- aplicaron y revirtieron como migraciones separadas (fix_parse_precio_
-- prefijo_dolar, revertir_promocion_norte_por_bug_regex,
-- promocion_habitaciones_tarifas_norte_piloto_v2/v3, sus reversiones) -- se
-- documentan aqui consolidados para que el archivo sea reproducible de punta
-- a punta sin depender de ese historial de prueba y error. Bugs corregidos:
--
--  1. parse_precio no aceptaba precios con "$" al inicio (ej. "$140").
--  2. La extraccion de precios SGL/DBL embebidos en texto libre asumia el
--     orden "ETIQUETA numero" (ej. "SGL 50"); algunas celdas traen el orden
--     inverso "numero ETIQUETA" (ej. "$130 SGL\n$175 DBL"), lo que causaba
--     que se capturara el numero equivocado. Ahora se extrae linea por
--     linea: para cada linea de la celda, si contiene "SGL"/"DBL" se toma
--     el numero de esa misma linea, sin asumir orden.
--  3. El nombre de habitacion solo se leia de "col_2", pero NORTE tiene al
--     menos 3 layouts distintos que usan columnas diferentes para el nombre:
--     "col_2", "¿" (header corrupto en la importacion, probablemente
--     "TIPO" en el Excel original) y "TIPO HABITACIÓN". Ignorar las otras 2
--     hacia que todas esas filas cayeran en la habitacion implicita
--     "Estándar" y colisionaran entre si, perdiendo precios reales por el
--     indice unico de tarifas_hospedaje.
--  4. Las habitaciones "extra" (columnas SUITE/JR. SUITE/PRESIDEN) se
--     desambiguan con el contexto de la fila (nombre de la habitacion
--     principal de esa fila) cuando el proveedor tiene mas de una fila en
--     staging, para no fusionar categorias distintas bajo un nombre
--     generico compartido.
--  5. Ya no se descartan colisiones en silencio via ON CONFLICT DO NOTHING:
--     si una fila trae un precio distinto al que ya existe para la misma
--     (habitacion, ocupacion), se reporta via RAISE NOTICE en vez de
--     insertarse o perderse sin dejar rastro.
--
-- Limitaciones conocidas que quedan para revision manual (no se fuerza una
-- interpretacion sobre datos de tarifas reales):
--  - Luna Volcán: 3 habitaciones con precio distinto entre dos bloques de
--    filas que parecen ser tarifa Extranjero vs Nacional ("... Ext" / "...
--    Nac" en el nombre de habitacion) -- el esquema actual no modela un
--    segmento de nacionalidad, asi que solo se guarda el primer precio y el
--    segundo se reporta como colision.
--  - 8 celdas de columnas extra con texto compuesto que no se pudo parsear
--    con confianza (unidades numeradas individualmente, columna mal
--    etiquetada, plan de alimentacion mezclado con precio, etc.) -- ver
--    RAISE NOTICE "Celdas no parseables" al aplicar esta migracion.
-- ============================================================================

-- Limpia lo que dejo la v1 (20260827191952) con sus bugs, para que esta
-- migracion sea el punto de partida correcto de aqui en adelante.
delete from tarifas_hospedaje
where proveedor_id in (
  select distinct proveedor_id from staging_tarifas_origen
  where hoja = 'NORTE' and proveedor_id is not null
);

delete from habitaciones
where proveedor_id in (
  select distinct proveedor_id from staging_tarifas_origen
  where hoja = 'NORTE' and proveedor_id is not null
);

delete from contratos_tarifa
where proveedor_id in (
  select distinct proveedor_id from staging_tarifas_origen
  where hoja = 'NORTE' and proveedor_id is not null
)
and notas like '%NORTE%';

create or replace function parse_precio(t text) returns numeric
language sql immutable
set search_path = ''
as $$
  select case
    when t is null then null
    when trim(both from regexp_replace(trim(t), '^\$\s*', '')) in ('-','','n/a','N/A','NA') then null
    when regexp_replace(trim(t), '^\$\s*', '') ~ '^[0-9]+(\.[0-9]+)?$'
      then regexp_replace(trim(t), '^\$\s*', '')::numeric
    else null
  end
$$;

create or replace function inferir_categoria(nombre text) returns public.categoria_habitacion
language sql immutable
set search_path = ''
as $$
  select case
    when nombre ilike '%presiden%' then 'SUITE_PRESIDENCIAL'::public.categoria_habitacion
    when nombre ilike '%jr%suite%' or nombre ilike '%junior%suite%' then 'JR_SUITE'::public.categoria_habitacion
    when nombre ilike '%suite%' then 'SUITE'::public.categoria_habitacion
    when nombre ilike '%deluxe%' or nombre ilike '%delux%' then 'DELUXE'::public.categoria_habitacion
    when nombre ilike '%superior%' then 'SUPERIOR'::public.categoria_habitacion
    when nombre ilike '%familiar%' or nombre ilike '%family%' then 'FAMILIAR'::public.categoria_habitacion
    when nombre ilike '%caba%' then 'CABANA'::public.categoria_habitacion
    when nombre ilike '%bungalow%' then 'BUNGALOW'::public.categoria_habitacion
    when nombre ilike '%loft%' then 'LOFT'::public.categoria_habitacion
    when nombre ilike '%est%ndar%' or nombre ilike '%standard%' then 'ESTANDAR'::public.categoria_habitacion
    else 'OTRO'::public.categoria_habitacion
  end
$$;

do $$
declare
  r record;
  v_contrato_id uuid;
  v_habitacion_id uuid;
  v_room_nombre text;
  v_num_unidades int;
  v_precio numeric;
  v_existente numeric;
  v_ocupaciones text[] := array['SENCILLA','DOBLE','TRIPLE','CUADRUPLE'];
  v_codigos     text[] := array['SGL','DBL','TPL','CPL'];
  v_extra_cols  text[] := array['SUITE','JR. SUITE','PRESIDEN'];
  v_extra_names text[] := array['Suite','Jr. Suite','Suite Presidencial'];
  v_extra_nombre_final text;
  i int;
  v_habitaciones_creadas int := 0;
  v_tarifas_insertadas int := 0;
  v_no_parseables text[] := '{}';
  v_colisiones text[] := '{}';
  v_extra_val text;
  v_sgl numeric;
  v_dbl numeric;
  v_linea text;
  v_filas_proveedor int;
begin
  for r in
    select distinct proveedor_id
    from staging_tarifas_origen
    where hoja = 'NORTE' and proveedor_id is not null
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026
    limit 1;

    if v_contrato_id is null then
      insert into contratos_tarifa (proveedor_id, anio, fecha_desde, fecha_hasta, moneda, tipo, estado, notas)
      values (r.proveedor_id, 2026, '2026-01-01', '2026-12-31', 'USD', 'NETA', 'BORRADOR',
              'Contrato generado automaticamente al promover staging_tarifas_origen (hoja NORTE). Fechas de vigencia por confirmar.')
      returning id into v_contrato_id;
    end if;
  end loop;

  for r in
    select id, proveedor_id, nombre_propagado, columnas,
      count(*) over (partition by proveedor_id) as filas_proveedor
    from staging_tarifas_origen
    where hoja = 'NORTE' and proveedor_id is not null
    order by fila_numero
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026 limit 1;

    v_room_nombre := coalesce(
      nullif(trim(r.columnas->>'col_2'), '-'),
      nullif(trim(r.columnas->>'¿'), '-'),
      nullif(trim(r.columnas->>'TIPO HABITACIÓN'), '-'),
      'Estándar'
    );
    v_filas_proveedor := r.filas_proveedor;

    select id into v_habitacion_id from habitaciones
    where proveedor_id = r.proveedor_id and nombre = v_room_nombre;

    if v_habitacion_id is null then
      v_num_unidades := case
        when v_room_nombre !~ '/' and v_room_nombre ~ '\([0-9]+\)'
          then (regexp_match(v_room_nombre, '\(([0-9]+)\)'))[1]::int
        else null
      end;
      insert into habitaciones (proveedor_id, nombre, categoria, num_unidades)
      values (r.proveedor_id, v_room_nombre, inferir_categoria(v_room_nombre), v_num_unidades)
      returning id into v_habitacion_id;
      v_habitaciones_creadas := v_habitaciones_creadas + 1;
    end if;

    for i in 1..4 loop
      v_precio := parse_precio(r.columnas->>v_ocupaciones[i]);
      if v_precio is not null then
        select precio into v_existente from tarifas_hospedaje
        where contrato_id = v_contrato_id and habitacion_id = v_habitacion_id
          and ocupacion_codigo = v_codigos[i] and plan_codigo = 'BB' and temporada_id is null
          and pax_min is null and habitaciones_min is null;

        if v_existente is null then
          insert into tarifas_hospedaje
            (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, origen_id)
          values
            (v_contrato_id, r.proveedor_id, v_habitacion_id, v_codigos[i], 'BB', 'POR_HABITACION', v_precio, r.id);
          v_tarifas_insertadas := v_tarifas_insertadas + 1;
        elsif v_existente <> v_precio then
          v_colisiones := v_colisiones || (coalesce(r.nombre_propagado,'?') || ' / ' || v_room_nombre || ' / ' || v_codigos[i]
            || ': ya existe ' || v_existente || ', fila nueva trae ' || v_precio);
        end if;
      end if;
    end loop;

    for i in 1..3 loop
      v_extra_val := r.columnas->>v_extra_cols[i];
      if v_extra_val is not null and trim(v_extra_val) not in ('-','','n/a','N/A') then
        v_precio := parse_precio(v_extra_val);

        v_extra_nombre_final := case
          when v_filas_proveedor > 1 then v_extra_names[i] || ' (' || v_room_nombre || ')'
          else v_extra_names[i]
        end;

        if v_precio is not null then
          select id into v_habitacion_id from habitaciones
          where proveedor_id = r.proveedor_id and nombre = v_extra_nombre_final;
          if v_habitacion_id is null then
            insert into habitaciones (proveedor_id, nombre, categoria)
            values (r.proveedor_id, v_extra_nombre_final, inferir_categoria(v_extra_names[i]))
            returning id into v_habitacion_id;
            v_habitaciones_creadas := v_habitaciones_creadas + 1;
          end if;

          select precio into v_existente from tarifas_hospedaje
          where contrato_id = v_contrato_id and habitacion_id = v_habitacion_id
            and ocupacion_codigo = 'SGL' and plan_codigo = 'BB' and temporada_id is null
            and pax_min is null and habitaciones_min is null;

          if v_existente is null then
            insert into tarifas_hospedaje
              (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, origen_id)
            values
              (v_contrato_id, r.proveedor_id, v_habitacion_id, 'SGL', 'BB', 'POR_HABITACION', v_precio, r.id);
            v_tarifas_insertadas := v_tarifas_insertadas + 1;
          elsif v_existente <> v_precio then
            v_colisiones := v_colisiones || (coalesce(r.nombre_propagado,'?') || ' / ' || v_extra_nombre_final || ' / SGL: ya existe ' || v_existente || ', fila nueva trae ' || v_precio);
          end if;

        else
          v_sgl := null; v_dbl := null;
          foreach v_linea in array string_to_array(v_extra_val, E'\n') loop
            if v_linea ~* 'SGL' then
              v_sgl := (regexp_match(v_linea, '([0-9]+(\.[0-9]+)?)'))[1]::numeric;
            end if;
            if v_linea ~* 'DBL' then
              v_dbl := (regexp_match(v_linea, '([0-9]+(\.[0-9]+)?)'))[1]::numeric;
            end if;
          end loop;

          if v_sgl is not null or v_dbl is not null then
            select id into v_habitacion_id from habitaciones
            where proveedor_id = r.proveedor_id and nombre = v_extra_nombre_final;
            if v_habitacion_id is null then
              insert into habitaciones (proveedor_id, nombre, categoria)
              values (r.proveedor_id, v_extra_nombre_final, inferir_categoria(v_extra_names[i]))
              returning id into v_habitacion_id;
              v_habitaciones_creadas := v_habitaciones_creadas + 1;
            end if;

            if v_sgl is not null then
              select precio into v_existente from tarifas_hospedaje
              where contrato_id = v_contrato_id and habitacion_id = v_habitacion_id
                and ocupacion_codigo = 'SGL' and plan_codigo = 'BB' and temporada_id is null
                and pax_min is null and habitaciones_min is null;
              if v_existente is null then
                insert into tarifas_hospedaje
                  (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, origen_id)
                values (v_contrato_id, r.proveedor_id, v_habitacion_id, 'SGL', 'BB', 'POR_HABITACION', v_sgl, r.id);
                v_tarifas_insertadas := v_tarifas_insertadas + 1;
              elsif v_existente <> v_sgl then
                v_colisiones := v_colisiones || (coalesce(r.nombre_propagado,'?') || ' / ' || v_extra_nombre_final || ' / SGL: ya existe ' || v_existente || ', fila nueva trae ' || v_sgl);
              end if;
            end if;

            if v_dbl is not null then
              select precio into v_existente from tarifas_hospedaje
              where contrato_id = v_contrato_id and habitacion_id = v_habitacion_id
                and ocupacion_codigo = 'DBL' and plan_codigo = 'BB' and temporada_id is null
                and pax_min is null and habitaciones_min is null;
              if v_existente is null then
                insert into tarifas_hospedaje
                  (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, origen_id)
                values (v_contrato_id, r.proveedor_id, v_habitacion_id, 'DBL', 'BB', 'POR_HABITACION', v_dbl, r.id);
                v_tarifas_insertadas := v_tarifas_insertadas + 1;
              elsif v_existente <> v_dbl then
                v_colisiones := v_colisiones || (coalesce(r.nombre_propagado,'?') || ' / ' || v_extra_nombre_final || ' / DBL: ya existe ' || v_existente || ', fila nueva trae ' || v_dbl);
              end if;
            end if;
          else
            v_no_parseables := v_no_parseables || (coalesce(r.nombre_propagado,'?') || ' / ' || v_extra_cols[i] || ' = "' || v_extra_val || '"');
          end if;
        end if;
      end if;
    end loop;
  end loop;

  raise notice 'Habitaciones creadas: %', v_habitaciones_creadas;
  raise notice 'Tarifas insertadas: %', v_tarifas_insertadas;
  if array_length(v_colisiones, 1) > 0 then
    raise notice 'COLISIONES (mismo cuarto+ocupacion, precio distinto, %): %', array_length(v_colisiones,1), array_to_string(v_colisiones, ' || ');
  end if;
  if array_length(v_no_parseables, 1) > 0 then
    raise notice 'Celdas no parseables (%): %', array_length(v_no_parseables,1), array_to_string(v_no_parseables, ' | ');
  end if;
end $$;
