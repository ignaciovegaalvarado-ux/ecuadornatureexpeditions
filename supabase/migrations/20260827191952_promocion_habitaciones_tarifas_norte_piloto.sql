-- ============================================================================
-- PILOTO Task 3: promover habitaciones + tarifas_hospedaje desde
-- staging_tarifas_origen para la hoja NORTE (161 filas), como validacion del
-- enfoque antes de aplicarlo a las 7 hojas restantes.
--
-- Layouts detectados en NORTE:
--  a) multi-fila por hotel: col_2 nombra la habitacion, SENCILLA/DOBLE/
--     TRIPLE/CUADRUPLE son sus precios por ocupacion.
--  b) fila unica por hotel: col_2 vacio ("-"), SENCILLA/DOBLE/TRIPLE/
--     CUADRUPLE son la habitacion implicita "Estándar", y SUITE/JR. SUITE/
--     PRESIDEN son categorias de habitacion adicionales, cada una con su
--     propio precio (a veces limpio, a veces texto libre "SGL 50\nDBL $76").
--
-- NOTA: esta v1 tenia bugs (regex SGL/DBL con orden fijo, colisiones de
-- nombre de habitacion) corregidos en migraciones posteriores (ver
-- revertir_promocion_norte_por_bug_regex y siguientes). Se conserva tal cual
-- se aplico para que el historial de migraciones coincida con la base remota.
-- ============================================================================

create or replace function parse_precio(t text) returns numeric
language sql immutable
set search_path = ''
as $$
  select case
    when t is null then null
    when trim(t) in ('-','','n/a','N/A','NA') then null
    when trim(t) ~ '^[0-9]+(\.[0-9]+)?$' then trim(t)::numeric
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
  v_col_2 text;
  v_ocupaciones text[] := array['SENCILLA','DOBLE','TRIPLE','CUADRUPLE'];
  v_codigos     text[] := array['SGL','DBL','TPL','CPL'];
  v_extra_cols  text[] := array['SUITE','JR. SUITE','PRESIDEN'];
  v_extra_names text[] := array['Suite','Jr. Suite','Suite Presidencial'];
  i int;
  v_habitaciones_creadas int := 0;
  v_tarifas_insertadas int := 0;
  v_no_parseables text[] := '{}';
  v_extra_val text;
  v_sgl numeric;
  v_dbl numeric;
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
    select id, proveedor_id, nombre_propagado, columnas
    from staging_tarifas_origen
    where hoja = 'NORTE' and proveedor_id is not null
    order by fila_numero
  loop
    select id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = 2026 limit 1;

    v_col_2 := nullif(trim(r.columnas->>'col_2'), '-');
    v_room_nombre := coalesce(v_col_2, 'Estándar');

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
        insert into tarifas_hospedaje
          (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, origen_id)
        values
          (v_contrato_id, r.proveedor_id, v_habitacion_id, v_codigos[i], 'BB', 'POR_HABITACION', v_precio, r.id)
        on conflict do nothing;
        v_tarifas_insertadas := v_tarifas_insertadas + 1;
      end if;
    end loop;

    for i in 1..3 loop
      v_extra_val := r.columnas->>v_extra_cols[i];
      if v_extra_val is not null and trim(v_extra_val) not in ('-','','n/a','N/A') then
        v_precio := parse_precio(v_extra_val);

        if v_precio is not null then
          select id into v_habitacion_id from habitaciones
          where proveedor_id = r.proveedor_id and nombre = v_extra_names[i];
          if v_habitacion_id is null then
            insert into habitaciones (proveedor_id, nombre, categoria)
            values (r.proveedor_id, v_extra_names[i], inferir_categoria(v_extra_names[i]))
            returning id into v_habitacion_id;
            v_habitaciones_creadas := v_habitaciones_creadas + 1;
          end if;
          insert into tarifas_hospedaje
            (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, origen_id)
          values
            (v_contrato_id, r.proveedor_id, v_habitacion_id, 'SGL', 'BB', 'POR_HABITACION', v_precio, r.id)
          on conflict do nothing;
          v_tarifas_insertadas := v_tarifas_insertadas + 1;

        else
          v_sgl := null; v_dbl := null;
          if v_extra_val ~* 'SGL' then
            v_sgl := (regexp_match(v_extra_val, 'SGL\D*([0-9]+(\.[0-9]+)?)', 'i'))[1]::numeric;
          end if;
          if v_extra_val ~* 'DBL' then
            v_dbl := (regexp_match(v_extra_val, 'DBL\D*([0-9]+(\.[0-9]+)?)', 'i'))[1]::numeric;
          end if;

          if v_sgl is not null or v_dbl is not null then
            select id into v_habitacion_id from habitaciones
            where proveedor_id = r.proveedor_id and nombre = v_extra_names[i];
            if v_habitacion_id is null then
              insert into habitaciones (proveedor_id, nombre, categoria)
              values (r.proveedor_id, v_extra_names[i], inferir_categoria(v_extra_names[i]))
              returning id into v_habitacion_id;
              v_habitaciones_creadas := v_habitaciones_creadas + 1;
            end if;
            if v_sgl is not null then
              insert into tarifas_hospedaje
                (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, origen_id)
              values (v_contrato_id, r.proveedor_id, v_habitacion_id, 'SGL', 'BB', 'POR_HABITACION', v_sgl, r.id)
              on conflict do nothing;
              v_tarifas_insertadas := v_tarifas_insertadas + 1;
            end if;
            if v_dbl is not null then
              insert into tarifas_hospedaje
                (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, origen_id)
              values (v_contrato_id, r.proveedor_id, v_habitacion_id, 'DBL', 'BB', 'POR_HABITACION', v_dbl, r.id)
              on conflict do nothing;
              v_tarifas_insertadas := v_tarifas_insertadas + 1;
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
  if array_length(v_no_parseables, 1) > 0 then
    raise notice 'Celdas no parseables (revision manual, %): %', array_length(v_no_parseables,1), array_to_string(v_no_parseables, ' | ');
  end if;
end $$;
