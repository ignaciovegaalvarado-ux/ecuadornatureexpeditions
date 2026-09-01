-- ============================================================================
-- Task 3 (completa): promueve las 7 hojas restantes de staging_tarifas_origen
-- (COSTA, CENTRO-SUR, CLOUDFOREST, GALAPAGOS -> tarifas_hospedaje;
-- RAINFOREST, BARCOS -> tarifas_programa; RESTAURANTE -> tarifas_servicio),
-- generalizando y corrigiendo la logica validada en el piloto de NORTE.
--
-- Consolida el ciclo real de correccion aplicado en produccion (varias
-- rondas via MCP) para que el archivo sea reproducible de punta a punta:
--
--  1. parse_precio: acepta "$140" (prefijo dolar) y "234,42" (coma decimal
--     latinoamericana), ademas del formato con punto.
--  2. Nombre de habitacion: coalesce(col_2, "¿", "TIPO HABITACIÓN",
--     "HABITACIÓN", "Tipo habitación") -- NORTE solo necesitaba 3 de estas
--     claves; CLOUDFOREST y GALAPAGOS usan las otras 2.
--  3. Filas "continuacion" (mismo cuarto, otro plan de alimentacion o rango
--     de pax en vez de nombre de habitacion nuevo): se reconocen los
--     valores SA/BB/MAP/FAP/AI y patrones "1-10pax"/"10pax+"/"10+", con o
--     sin calificador de nacionalidad ("Extranjeros"/"Nacionales", que el
--     esquema no modela -- se guarda un precio con nota en observaciones y
--     el otro se reporta como colision). Si es la PRIMERA fila del bloque
--     (no hay cuarto previo), cae a la habitacion implicita "Estándar" en
--     vez de crear una habitacion literalmente llamada "1-10pax".
--  4. Habitaciones "extra" (columnas SUITE/JR. SUITE/PRESIDEN) se
--     desambiguan con el nombre de la habitacion principal de la fila
--     cuando el proveedor tiene mas de una fila, para no fusionar
--     categorias distintas bajo un nombre generico compartido.
--  5. Las colisiones (mismo cuarto+ocupacion+plan+pax_min, precio distinto)
--     se reportan via RAISE NOTICE en vez de perderse en silencio.
--
-- Hallazgo importante en GALAPAGOS: 11 proveedores quedaron mal
-- clasificados como HOTEL durante la promocion de proveedores (tarea
-- anterior), pero sus filas en staging son en realidad tours/transporte de
-- un dia (lanchas de excursion, transfers, kayak, buceo) -- ver el bloque de
-- limpieza al final. Sus filas de staging quedan intactas para una futura
-- promocion correcta a tarifas_programa/tarifas_servicio.
-- ============================================================================

create or replace function parse_precio(t text) returns numeric
language sql immutable
set search_path = ''
as $$
  select case
    when t is null then null
    when trim(both from regexp_replace(trim(t), '^\$\s*', '')) in ('-','','n/a','N/A','NA') then null
    when regexp_replace(trim(t), '^\$\s*', '') ~ '^[0-9]+(\.[0-9]+)?$'
      then regexp_replace(trim(t), '^\$\s*', '')::numeric
    when regexp_replace(trim(t), '^\$\s*', '') ~ '^[0-9]+,[0-9]{1,2}$'
      then replace(regexp_replace(trim(t), '^\$\s*', ''), ',', '.')::numeric
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

create or replace function promover_hospedaje_hoja(p_hoja text, p_anio int default 2026) returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  r record;
  v_contrato_id uuid;
  v_habitacion_id uuid;
  v_room_raw text;
  v_room_nombre text;
  v_ultima_habitacion_id uuid;
  v_ultima_habitacion_nombre text;
  v_ultimo_proveedor uuid;
  v_plan_codigo text;
  v_pax_min int;
  v_pax_max int;
  v_nums int[];
  v_num_unidades int;
  v_precio numeric;
  v_existente numeric;
  v_observaciones text;
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
    where hoja = p_hoja and proveedor_id is not null
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = p_anio
    limit 1;

    if v_contrato_id is null then
      insert into contratos_tarifa (proveedor_id, anio, fecha_desde, fecha_hasta, moneda, tipo, estado, notas)
      values (r.proveedor_id, p_anio, (p_anio||'-01-01')::date, (p_anio||'-12-31')::date, 'USD', 'NETA', 'BORRADOR',
              'Contrato generado automaticamente al promover staging_tarifas_origen (hoja ' || p_hoja || '). Fechas de vigencia por confirmar.')
      returning id into v_contrato_id;
    end if;
  end loop;

  v_ultimo_proveedor := null;
  v_ultima_habitacion_id := null;
  v_ultima_habitacion_nombre := null;

  for r in
    select id, proveedor_id, nombre_propagado, columnas,
      count(*) over (partition by proveedor_id) as filas_proveedor
    from staging_tarifas_origen
    where hoja = p_hoja and proveedor_id is not null
    order by fila_numero
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = p_anio limit 1;

    if r.proveedor_id is distinct from v_ultimo_proveedor then
      v_ultima_habitacion_id := null;
      v_ultima_habitacion_nombre := null;
      v_ultimo_proveedor := r.proveedor_id;
    end if;

    v_room_raw := coalesce(
      nullif(trim(r.columnas->>'col_2'), '-'),
      nullif(trim(r.columnas->>'¿'), '-'),
      nullif(trim(r.columnas->>'TIPO HABITACIÓN'), '-'),
      nullif(trim(r.columnas->>'HABITACIÓN'), '-'),
      nullif(trim(r.columnas->>'Tipo habitación'), '-')
    );
    v_filas_proveedor := r.filas_proveedor;
    v_plan_codigo := 'BB';
    v_pax_min := null;
    v_pax_max := null;
    v_observaciones := null;

    if v_room_raw is null then
      v_room_nombre := coalesce(v_ultima_habitacion_nombre, 'Estándar');
    elsif upper(v_room_raw) in ('SA','BB','MAP','FAP','AI') then
      v_room_nombre := coalesce(v_ultima_habitacion_nombre, 'Estándar');
      v_plan_codigo := upper(v_room_raw);
    elsif v_room_raw ~* '^\d+\s*(-\s*\d+)?\s*(pax)?\s*\+?(\s+(extranjer[oa]s?|nacional(es)?))?\s*$' then
      v_room_nombre := coalesce(v_ultima_habitacion_nombre, 'Estándar');
      select array_agg((m[1])::int) into v_nums from regexp_matches(v_room_raw, '\d+', 'g') as m;
      if array_length(v_nums,1) = 2 then
        v_pax_min := v_nums[1]; v_pax_max := v_nums[2];
      elsif array_length(v_nums,1) = 1 then
        v_pax_min := v_nums[1]; v_pax_max := null;
      end if;
      if v_room_raw ~* 'extranjer|nacional' then
        v_observaciones := 'Segmento del Excel: "' || v_room_raw || '" (nacionalidad no modelada en el esquema actual)';
      end if;
    else
      v_room_nombre := v_room_raw;
    end if;

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

    v_ultima_habitacion_id := v_habitacion_id;
    v_ultima_habitacion_nombre := v_room_nombre;

    for i in 1..4 loop
      v_precio := parse_precio(r.columnas->>v_ocupaciones[i]);
      if v_precio is not null then
        select precio into v_existente from tarifas_hospedaje
        where contrato_id = v_contrato_id and habitacion_id = v_habitacion_id
          and ocupacion_codigo = v_codigos[i] and plan_codigo = v_plan_codigo
          and temporada_id is null
          and coalesce(pax_min,-1) = coalesce(v_pax_min,-1)
          and habitaciones_min is null;

        if v_existente is null then
          insert into tarifas_hospedaje
            (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, pax_min, pax_max, observaciones, origen_id)
          values
            (v_contrato_id, r.proveedor_id, v_habitacion_id, v_codigos[i], v_plan_codigo, 'POR_HABITACION', v_precio, v_pax_min, v_pax_max, v_observaciones, r.id);
          v_tarifas_insertadas := v_tarifas_insertadas + 1;
        elsif v_existente <> v_precio then
          v_colisiones := v_colisiones || (coalesce(r.nombre_propagado,'?') || ' / ' || v_room_nombre || ' / ' || v_codigos[i] || ' / plan=' || v_plan_codigo
            || ' / pax_min=' || coalesce(v_pax_min::text,'null')
            || ': ya existe ' || v_existente || ', fila nueva ("' || v_room_raw || '") trae ' || v_precio);
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

  raise notice '[%] Habitaciones creadas: %', p_hoja, v_habitaciones_creadas;
  raise notice '[%] Tarifas insertadas: %', p_hoja, v_tarifas_insertadas;
  if array_length(v_colisiones, 1) > 0 then
    raise notice '[%] COLISIONES (%): %', p_hoja, array_length(v_colisiones,1), array_to_string(v_colisiones, ' || ');
  end if;
  if array_length(v_no_parseables, 1) > 0 then
    raise notice '[%] Celdas no parseables (%): %', p_hoja, array_length(v_no_parseables,1), array_to_string(v_no_parseables, ' | ');
  end if;
end;
$$;

select promover_hospedaje_hoja('COSTA');
select promover_hospedaje_hoja('CENTRO-SUR');
select promover_hospedaje_hoja('CLOUDFOREST');
select promover_hospedaje_hoja('GALAPAGOS');

-- ---------------------------------------------------------------------------
-- RAINFOREST -> tarifas_programa (paquetes multi-dia de lodges amazonicos).
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_contrato_id uuid;
  v_dias int;
  v_noches int;
  v_precio numeric;
  v_precio_tkt numeric;
  v_comision numeric;
  v_suite_val text;
  v_partes text[];
  v_programas_creados int := 0;
begin
  for r in
    select distinct proveedor_id
    from staging_tarifas_origen
    where hoja = 'RAINFOREST' and proveedor_id is not null
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026 limit 1;
    if v_contrato_id is null then
      insert into contratos_tarifa (proveedor_id, anio, fecha_desde, fecha_hasta, moneda, tipo, estado, notas)
      values (r.proveedor_id, 2026, '2026-01-01', '2026-12-31', 'USD', 'NETA', 'BORRADOR',
              'Contrato generado automaticamente al promover staging_tarifas_origen (hoja RAINFOREST). Fechas de vigencia por confirmar.')
      returning id into v_contrato_id;
    end if;
  end loop;

  for r in
    select id, proveedor_id, columnas
    from staging_tarifas_origen
    where hoja = 'RAINFOREST' and proveedor_id is not null
      and nullif(trim(columnas->>'PROGRAMA'), '-') is not null
    order by fila_numero
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026 limit 1;

    v_dias := (regexp_match(r.columnas->>'PROGRAMA', '(\d+)\s*D'))[1]::int;
    v_noches := (regexp_match(r.columnas->>'PROGRAMA', '(\d+)\s*N'))[1]::int;
    v_precio_tkt := parse_precio(r.columnas->>'TKT');

    v_comision := case
      when trim(r.columnas->>'Comisión') ~ '^\d+(\.\d+)?%$'
        then replace(trim(r.columnas->>'Comisión'),'%','')::numeric / 100
      when trim(r.columnas->>'Comisión') ~ '^\d+(\.\d+)?$'
        then trim(r.columnas->>'Comisión')::numeric
      else null
    end;

    v_precio := parse_precio(r.columnas->>'SENCILLA');
    if v_precio is not null then
      insert into tarifas_programa
        (contrato_id, proveedor_id, nombre_programa, dias, noches, ocupacion_codigo, categoria_cabina,
         precio_por_pax, incluye_tkt, precio_tkt, comision_pct, observaciones, origen_id)
      values
        (v_contrato_id, r.proveedor_id, trim(r.columnas->>'PROGRAMA'), v_dias, v_noches, 'SGL', 'Estándar',
         v_precio, v_precio_tkt is not null, v_precio_tkt, v_comision, r.columnas->>'Observaciones', r.id);
      v_programas_creados := v_programas_creados + 1;
    end if;

    v_precio := parse_precio(r.columnas->>'DOBLE');
    if v_precio is not null then
      insert into tarifas_programa
        (contrato_id, proveedor_id, nombre_programa, dias, noches, ocupacion_codigo, categoria_cabina,
         precio_por_pax, incluye_tkt, precio_tkt, comision_pct, observaciones, origen_id)
      values
        (v_contrato_id, r.proveedor_id, trim(r.columnas->>'PROGRAMA'), v_dias, v_noches, 'DBL', 'Estándar',
         v_precio, v_precio_tkt is not null, v_precio_tkt, v_comision, r.columnas->>'Observaciones', r.id);
      v_programas_creados := v_programas_creados + 1;
    end if;

    v_suite_val := r.columnas->>'SUITE SGL/DBL';
    if v_suite_val is not null and trim(v_suite_val) not in ('-','') then
      v_partes := regexp_split_to_array(v_suite_val, '\s*/\s*');
      if array_length(v_partes,1) = 2 then
        if parse_precio(v_partes[1]) is not null then
          insert into tarifas_programa
            (contrato_id, proveedor_id, nombre_programa, dias, noches, ocupacion_codigo, categoria_cabina,
             precio_por_pax, incluye_tkt, precio_tkt, comision_pct, observaciones, origen_id)
          values
            (v_contrato_id, r.proveedor_id, trim(r.columnas->>'PROGRAMA'), v_dias, v_noches, 'SGL', 'Suite',
             parse_precio(v_partes[1]), v_precio_tkt is not null, v_precio_tkt, v_comision, r.columnas->>'Observaciones', r.id);
          v_programas_creados := v_programas_creados + 1;
        end if;
        if parse_precio(v_partes[2]) is not null then
          insert into tarifas_programa
            (contrato_id, proveedor_id, nombre_programa, dias, noches, ocupacion_codigo, categoria_cabina,
             precio_por_pax, incluye_tkt, precio_tkt, comision_pct, observaciones, origen_id)
          values
            (v_contrato_id, r.proveedor_id, trim(r.columnas->>'PROGRAMA'), v_dias, v_noches, 'DBL', 'Suite',
             parse_precio(v_partes[2]), v_precio_tkt is not null, v_precio_tkt, v_comision, r.columnas->>'Observaciones', r.id);
          v_programas_creados := v_programas_creados + 1;
        end if;
      end if;
    end if;
  end loop;

  raise notice '[RAINFOREST] tarifas_programa insertadas: %', v_programas_creados;
end $$;

-- ---------------------------------------------------------------------------
-- BARCOS -> tarifas_programa (cruceros de Galapagos). Layout distinto: la
-- duracion es el NOMBRE de columna ("5D","6D","8 D"), ACOMODACION da la
-- categoria de cabina (se hereda de la fila anterior del mismo barco), y
-- col_4 da la ocupacion (por defecto DBL).
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_contrato_id uuid;
  v_barco text;
  v_ultimo_barco text;
  v_ultimo_proveedor uuid;
  v_acomodacion text;
  v_ocupacion text;
  v_comision numeric;
  v_dias int;
  v_precio numeric;
  v_key text;
  v_val text;
  v_programas_creados int := 0;
begin
  for r in
    select distinct proveedor_id
    from staging_tarifas_origen
    where hoja = 'BARCOS' and proveedor_id is not null
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026 limit 1;
    if v_contrato_id is null then
      insert into contratos_tarifa (proveedor_id, anio, fecha_desde, fecha_hasta, moneda, tipo, estado, notas)
      values (r.proveedor_id, 2026, '2026-01-01', '2026-12-31', 'USD', 'NETA', 'BORRADOR',
              'Contrato generado automaticamente al promover staging_tarifas_origen (hoja BARCOS). Fechas de vigencia por confirmar.')
      returning id into v_contrato_id;
    end if;
  end loop;

  v_ultimo_proveedor := null;
  v_ultimo_barco := null;

  for r in
    select id, proveedor_id, columnas
    from staging_tarifas_origen
    where hoja = 'BARCOS' and proveedor_id is not null
    order by fila_numero
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026 limit 1;

    if r.proveedor_id is distinct from v_ultimo_proveedor then
      v_ultimo_barco := null;
      v_ultimo_proveedor := r.proveedor_id;
    end if;

    v_barco := nullif(trim(r.columnas->>'BARCO'), '-');
    if v_barco is not null then
      v_ultimo_barco := v_barco;
    end if;

    v_acomodacion := coalesce(nullif(trim(r.columnas->>'ACOMODACION'), '-'), 'Estándar');

    v_ocupacion := case upper(trim(coalesce(r.columnas->>'col_4','')))
      when 'TPL' then 'TPL'
      when 'TRIPLE' then 'TPL'
      when 'SGL' then 'SGL'
      when 'SINGLE' then 'SGL'
      when 'DBL' then 'DBL'
      when 'DOUBLE' then 'DBL'
      else 'DBL'
    end;

    v_comision := case
      when trim(r.columnas->>'Comision') ~ '^\d+(\.\d+)?%$'
        then replace(trim(r.columnas->>'Comision'),'%','')::numeric / 100
      when trim(r.columnas->>'Comision') ~ '^\d+(\.\d+)?$'
        then trim(r.columnas->>'Comision')::numeric
      else null
    end;

    for v_key, v_val in select * from jsonb_each_text(r.columnas) loop
      if replace(v_key, ' ', '') ~ '^\d+D$' then
        v_dias := (regexp_match(replace(v_key,' ',''), '^(\d+)D$'))[1]::int;
        v_precio := parse_precio(v_val);
        if v_precio is not null then
          insert into tarifas_programa
            (contrato_id, proveedor_id, nombre_programa, dias, ocupacion_codigo, categoria_cabina,
             precio_por_pax, comision_pct, observaciones, origen_id)
          values
            (v_contrato_id, r.proveedor_id, coalesce(v_ultimo_barco, 'Sin nombre') || ' ' || v_dias || 'D',
             v_dias, v_ocupacion, v_acomodacion, v_precio, v_comision, r.columnas->>'OBSERVACIONES', r.id);
          v_programas_creados := v_programas_creados + 1;
        end if;
      end if;
    end loop;
  end loop;

  raise notice '[BARCOS] tarifas_programa insertadas: %', v_programas_creados;
end $$;

-- ---------------------------------------------------------------------------
-- RESTAURANTE -> tarifas_servicio. Solo columnas con significado claro
-- (ALMUERZO, CENA, DESAYUNO, BL=box lunch, GUÍA/CHOFER=guianza). Las
-- columnas "col_4"/"col_6"/"ESPECIAL" no tienen encabezado interpretable de
-- forma confiable y se dejan fuera.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_contrato_id uuid;
  v_precio numeric;
  v_insertadas int := 0;
begin
  for r in
    select distinct proveedor_id
    from staging_tarifas_origen
    where hoja = 'RESTAURANTE' and proveedor_id is not null
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026 limit 1;
    if v_contrato_id is null then
      insert into contratos_tarifa (proveedor_id, anio, fecha_desde, fecha_hasta, moneda, tipo, estado, notas)
      values (r.proveedor_id, 2026, '2026-01-01', '2026-12-31', 'USD', 'NETA', 'BORRADOR',
              'Contrato generado automaticamente al promover staging_tarifas_origen (hoja RESTAURANTE). Fechas de vigencia por confirmar.')
      returning id into v_contrato_id;
    end if;
  end loop;

  for r in
    select id, proveedor_id, columnas
    from staging_tarifas_origen
    where hoja = 'RESTAURANTE' and proveedor_id is not null
    order by fila_numero
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026 limit 1;

    v_precio := parse_precio(r.columnas->>'DESAYUNO');
    if v_precio is not null then
      insert into tarifas_servicio (contrato_id, proveedor_id, tipo, segmento, precio, observaciones, origen_id)
      values (v_contrato_id, r.proveedor_id, 'DESAYUNO', 'ADULTO', v_precio, r.columnas->>'OBSERVACIONES', r.id);
      v_insertadas := v_insertadas + 1;
    end if;

    v_precio := parse_precio(r.columnas->>'ALMUERZO');
    if v_precio is not null then
      insert into tarifas_servicio (contrato_id, proveedor_id, tipo, segmento, precio, observaciones, origen_id)
      values (v_contrato_id, r.proveedor_id, 'ALMUERZO', 'ADULTO', v_precio, r.columnas->>'OBSERVACIONES', r.id);
      v_insertadas := v_insertadas + 1;
    end if;

    v_precio := parse_precio(r.columnas->>'CENA');
    if v_precio is not null then
      insert into tarifas_servicio (contrato_id, proveedor_id, tipo, segmento, precio, observaciones, origen_id)
      values (v_contrato_id, r.proveedor_id, 'CENA', 'ADULTO', v_precio, r.columnas->>'OBSERVACIONES', r.id);
      v_insertadas := v_insertadas + 1;
    end if;

    v_precio := parse_precio(r.columnas->>'BL');
    if v_precio is not null then
      insert into tarifas_servicio (contrato_id, proveedor_id, tipo, segmento, precio, observaciones, origen_id)
      values (v_contrato_id, r.proveedor_id, 'BOX_LUNCH', 'ADULTO', v_precio, r.columnas->>'OBSERVACIONES', r.id);
      v_insertadas := v_insertadas + 1;
    end if;

    v_precio := parse_precio(r.columnas->>'GUÍA/CHOFER');
    if v_precio is not null then
      insert into tarifas_servicio (contrato_id, proveedor_id, tipo, segmento, precio, observaciones, origen_id)
      values (v_contrato_id, r.proveedor_id, 'GUIANZA', 'GUIA', v_precio, r.columnas->>'OBSERVACIONES', r.id);
      v_insertadas := v_insertadas + 1;
    end if;
  end loop;

  raise notice '[RESTAURANTE] tarifas_servicio insertadas: %', v_insertadas;
end $$;

-- ---------------------------------------------------------------------------
-- Limpieza: 11 proveedores de GALAPAGOS quedaron clasificados como HOTEL en
-- la promocion de proveedores (tarea anterior), pero sus filas de staging
-- son tours/transporte de un dia (excursiones en lancha, transfers, kayak,
-- buceo), no hospedaje. La promocion generica de arriba les creo
-- habitaciones y tarifas_hospedaje falsas a partir de esas filas. Se
-- eliminan aqui; sus staging rows quedan intactas para una futura
-- promocion correcta a tarifas_programa/tarifas_servicio, que no se
-- intenta en esta migracion por la variedad de layouts que amerita su
-- propio diseño.
-- ---------------------------------------------------------------------------
delete from tarifas_hospedaje
where proveedor_id in (
  select id from proveedores where nombre in (
    'Contratur/ JuanCarlos Naula','GPS PARADEISOS (LUIS SALGADO)','JOSELITO (Floreana)',
    'LANCHA ADRIANA','LOBO (SX) 2026','SCUBA IGUANA','SHARKSKY (SCY)','TROPICAL ADV (ISA)',
    'LP VALERIA','Marthita','ALTAMAR'
  )
);
delete from habitaciones
where proveedor_id in (
  select id from proveedores where nombre in (
    'Contratur/ JuanCarlos Naula','GPS PARADEISOS (LUIS SALGADO)','JOSELITO (Floreana)',
    'LANCHA ADRIANA','LOBO (SX) 2026','SCUBA IGUANA','SHARKSKY (SCY)','TROPICAL ADV (ISA)',
    'LP VALERIA','Marthita','ALTAMAR'
  )
);

-- ---------------------------------------------------------------------------
-- Limpieza final: habitaciones que quedaron sin ninguna tarifa asociada
-- (filas cuyo unico dato era texto no parseable, filas de referencia sin
-- precio real, o los proveedores de tours recien eliminados arriba). No se
-- pierde ningun precio real: por definicion estas habitaciones ya estaban
-- vacias.
--
-- IMPORTANTE: al limpiar contratos huerfanos hay que revisar los TRES tipos
-- de tarifa (hospedaje, programa, servicio), no solo tarifas_hospedaje --
-- limpiar solo por tarifas_hospedaje borro por error, via cascada, los
-- contratos (y con ellos las tarifas) de RAINFOREST/BARCOS/RESTAURANTE la
-- primera vez que se corrio esta limpieza en produccion.
-- ---------------------------------------------------------------------------
delete from habitaciones h
where not exists (select 1 from tarifas_hospedaje t where t.habitacion_id = h.id);

delete from contratos_tarifa c
where c.notas like '%staging_tarifas_origen%'
  and not exists (select 1 from tarifas_hospedaje t where t.contrato_id = c.id)
  and not exists (select 1 from tarifas_programa tp where tp.contrato_id = c.id)
  and not exists (select 1 from tarifas_servicio ts where ts.contrato_id = c.id);
