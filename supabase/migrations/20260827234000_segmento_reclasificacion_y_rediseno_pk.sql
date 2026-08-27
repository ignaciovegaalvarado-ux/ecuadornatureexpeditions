-- ============================================================================
-- 1) Segmento de nacionalidad como dimension independiente en
--    tarifas_hospedaje (Nacional/Extranjero), en vez de perder uno de los
--    dos precios o dejar una nota de texto como parche.
-- 2) Reclasificacion de 11 proveedores de GALAPAGOS de HOTEL a OPERADOR
--    (son excursiones de dia / transporte, no hospedaje).
-- 3) Rediseño de llaves primarias del subsistema proveedores/tarifas: cada
--    tabla pasa de una columna "id" (uuid) generica a una columna con
--    nombre propio y un codigo corto legible (proveedores.proveedor_id =
--    'PRO0001', habitaciones.habitacion_id = 'HAB0001', etc.), siguiendo el
--    mismo patron ya usado en ocupaciones/planes_alimentacion (codigo corto
--    y significativo como llave, no un id generico).
--
--    Alcance: solo las tablas de proveedores/tarifas. El subsistema de
--    itinerarios (itinerarios_plantilla, instancia_dias, etc.) NO se
--    redisena, pero sus columnas FK hacia proveedores/habitaciones/
--    ubicaciones SI se sincronizan al nuevo valor para no dejar referencias
--    rotas (actividades, bloques_texto, instancia_dia_hospedajes,
--    itinerario_dia_hospedajes, instancia_dias, itinerario_dias).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. Vistas que dependen de columnas por renombrar: se dropean y se
--    recrean al final con los nombres nuevos (mismo security_invoker).
-- ---------------------------------------------------------------------------
drop view v_tarifas_hospedaje;
drop view v_itinerario_dias;
drop view v_costo_alojamiento_dia;


-- ---------------------------------------------------------------------------
-- 1. SEGMENTO DE NACIONALIDAD
-- ---------------------------------------------------------------------------
create table segmentos_pax (
  codigo text primary key,   -- 'NAC', 'EXT'
  nombre text not null
);
insert into segmentos_pax (codigo, nombre) values
  ('NAC', 'Nacional'),
  ('EXT', 'Extranjero');

alter table segmentos_pax enable row level security;
create policy "lectura autenticada" on segmentos_pax
  for select to authenticated using (true);

alter table tarifas_hospedaje
  add column segmento_codigo text references segmentos_pax(codigo);

drop index tarifas_hospedaje_grano_uk;
create unique index tarifas_hospedaje_grano_uk on tarifas_hospedaje (
  contrato_id, habitacion_id, ocupacion_codigo, plan_codigo,
  coalesce(temporada_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(pax_min, -1), coalesce(habitaciones_min, -1),
  coalesce(segmento_codigo, '*')
);

-- Luna Volcán: 3 habitaciones con el mismo nombre en el bloque "...Ext" y
-- "...Nac" del Excel (NORTE, filas 164-167 vs 168-171) colisionaban; se
-- guardaba solo el precio Ext. Se marca ese precio como EXT y se inserta
-- el precio Nac que se habia descartado.
do $$
declare
  v_proveedor_id text;
  v_contrato_id text;
  v_hab_vista_banos text;
  v_hab_suite_romantica text;
  v_hab_suite_volcanica text;
begin
  select proveedor_id into v_proveedor_id from proveedores where nombre = 'Luna Volcán';
  select contrato_id into v_contrato_id from contratos_tarifa where proveedor_id = v_proveedor_id and anio = 2026;

  select habitacion_id into v_hab_vista_banos from habitaciones where proveedor_id = v_proveedor_id and nombre = 'Vista a Baños';
  select habitacion_id into v_hab_suite_romantica from habitaciones where proveedor_id = v_proveedor_id and nombre = 'Suite Romantica';
  select habitacion_id into v_hab_suite_volcanica from habitaciones where proveedor_id = v_proveedor_id and nombre = 'Suite volcanica y arbol';

  update tarifas_hospedaje set segmento_codigo = 'EXT'
  where habitacion_id in (v_hab_vista_banos, v_hab_suite_romantica, v_hab_suite_volcanica)
    and segmento_codigo is null;

  insert into tarifas_hospedaje (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, segmento_codigo)
  values
    (v_contrato_id, v_proveedor_id, v_hab_vista_banos, 'SGL', 'BB', 'POR_HABITACION', 275, 'NAC'),
    (v_contrato_id, v_proveedor_id, v_hab_vista_banos, 'TPL', 'BB', 'POR_HABITACION', 412, 'NAC'),
    (v_contrato_id, v_proveedor_id, v_hab_suite_romantica, 'SGL', 'BB', 'POR_HABITACION', 304, 'NAC'),
    (v_contrato_id, v_proveedor_id, v_hab_suite_volcanica, 'SGL', 'BB', 'POR_HABITACION', 367, 'NAC');
end $$;

-- Posada del Ángel: "1-4 pax Extranjeros" gano la colision contra "1-4 pax
-- nacionales" (mismo pax_min=1). Se marca la existente como EXT (limpiando
-- la nota de texto, ya no hace falta) y se inserta NAC.
do $$
declare
  v_proveedor_id text;
  v_contrato_id text;
  v_habitacion_id text;
begin
  select proveedor_id into v_proveedor_id from proveedores where nombre = 'Posada del Ángel';
  select contrato_id into v_contrato_id from contratos_tarifa where proveedor_id = v_proveedor_id and anio = 2026;
  select habitacion_id into v_habitacion_id from habitaciones where proveedor_id = v_proveedor_id and nombre = 'Estándar';

  update tarifas_hospedaje
     set segmento_codigo = 'EXT', observaciones = null
   where habitacion_id = v_habitacion_id and pax_min = 1 and pax_max = 4;

  insert into tarifas_hospedaje (contrato_id, proveedor_id, habitacion_id, ocupacion_codigo, plan_codigo, base, precio, pax_min, pax_max, segmento_codigo)
  values
    (v_contrato_id, v_proveedor_id, v_habitacion_id, 'SGL', 'BB', 'POR_HABITACION', 32, 1, 4, 'NAC'),
    (v_contrato_id, v_proveedor_id, v_habitacion_id, 'DBL', 'BB', 'POR_HABITACION', 55, 1, 4, 'NAC'),
    (v_contrato_id, v_proveedor_id, v_habitacion_id, 'TPL', 'BB', 'POR_HABITACION', 76, 1, 4, 'NAC'),
    (v_contrato_id, v_proveedor_id, v_habitacion_id, 'CPL', 'BB', 'POR_HABITACION', 90, 1, 4, 'NAC');
end $$;


-- ---------------------------------------------------------------------------
-- 2. RECLASIFICACION DE OPERADORES DE TOUR (GALAPAGOS)
-- ---------------------------------------------------------------------------
update proveedores
set tipo = 'OPERADOR'
where nombre in (
  'Contratur/ JuanCarlos Naula','GPS PARADEISOS (LUIS SALGADO)','JOSELITO (Floreana)',
  'LANCHA ADRIANA','LOBO (SX) 2026','SCUBA IGUANA','SHARKSKY (SCY)','TROPICAL ADV (ISA)',
  'LP VALERIA','Marthita','ALTAMAR'
);


-- ---------------------------------------------------------------------------
-- 3. REDISEÑO DE LLAVES PRIMARIAS
-- ---------------------------------------------------------------------------

-- 3.1 ubicaciones -----------------------------------------------------------
alter table ubicaciones add column ubicacion_id text;
with numbered as (select id, row_number() over (order by created_at) rn from ubicaciones)
update ubicaciones u set ubicacion_id = 'UBI' || lpad(numbered.rn::text,4,'0')
from numbered where numbered.id = u.id;
alter table ubicaciones alter column ubicacion_id set not null;

alter table proveedores add column ubicacion_code text;
update proveedores p set ubicacion_code = u.ubicacion_id from ubicaciones u where u.id = p.ubicacion_id;
alter table actividades add column ubicacion_code text;
update actividades a set ubicacion_code = u.ubicacion_id from ubicaciones u where u.id = a.ubicacion_id;
alter table bloques_texto add column ubicacion_code text;
update bloques_texto b set ubicacion_code = u.ubicacion_id from ubicaciones u where u.id = b.ubicacion_id;
alter table instancia_dias add column ubicacion_code text;
update instancia_dias i set ubicacion_code = u.ubicacion_id from ubicaciones u where u.id = i.ubicacion_id;
alter table itinerario_dias add column ubicacion_code text;
update itinerario_dias i set ubicacion_code = u.ubicacion_id from ubicaciones u where u.id = i.ubicacion_id;

alter table proveedores drop constraint proveedores_ubicacion_id_fkey;
alter table actividades drop constraint actividades_ubicacion_id_fkey;
alter table bloques_texto drop constraint bloques_texto_ubicacion_id_fkey;
alter table instancia_dias drop constraint instancia_dias_ubicacion_id_fkey;
alter table itinerario_dias drop constraint itinerario_dias_ubicacion_id_fkey;

alter table proveedores drop column ubicacion_id;
alter table proveedores rename column ubicacion_code to ubicacion_id;
alter table actividades drop column ubicacion_id;
alter table actividades rename column ubicacion_code to ubicacion_id;
alter table bloques_texto drop column ubicacion_id;
alter table bloques_texto rename column ubicacion_code to ubicacion_id;
alter table instancia_dias drop column ubicacion_id;
alter table instancia_dias rename column ubicacion_code to ubicacion_id;
alter table itinerario_dias drop column ubicacion_id;
alter table itinerario_dias rename column ubicacion_code to ubicacion_id;

alter table ubicaciones drop constraint ubicaciones_pkey;
alter table ubicaciones drop column id;
alter table ubicaciones add primary key (ubicacion_id);

alter table proveedores add constraint proveedores_ubicacion_id_fkey foreign key (ubicacion_id) references ubicaciones(ubicacion_id) on delete set null;
alter table actividades add constraint actividades_ubicacion_id_fkey foreign key (ubicacion_id) references ubicaciones(ubicacion_id) on delete set null;
alter table bloques_texto add constraint bloques_texto_ubicacion_id_fkey foreign key (ubicacion_id) references ubicaciones(ubicacion_id) on delete set null;
alter table instancia_dias add constraint instancia_dias_ubicacion_id_fkey foreign key (ubicacion_id) references ubicaciones(ubicacion_id) on delete set null;
alter table itinerario_dias add constraint itinerario_dias_ubicacion_id_fkey foreign key (ubicacion_id) references ubicaciones(ubicacion_id) on delete set null;


-- 3.2 proveedores -------------------------------------------------------------
alter table proveedores add column proveedor_id text;
with numbered as (select id, row_number() over (order by created_at) rn from proveedores)
update proveedores p set proveedor_id = 'PRO' || lpad(numbered.rn::text,4,'0')
from numbered where numbered.id = p.id;
alter table proveedores alter column proveedor_id set not null;

alter table contratos_tarifa add column proveedor_code text;
update contratos_tarifa c set proveedor_code = p.proveedor_id from proveedores p where p.id = c.proveedor_id;
alter table habitaciones add column proveedor_code text;
update habitaciones h set proveedor_code = p.proveedor_id from proveedores p where p.id = h.proveedor_id;
alter table politicas_cortesia add column proveedor_code text;
update politicas_cortesia t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table politicas_fiscales add column proveedor_code text;
update politicas_fiscales t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table politicas_ninos add column proveedor_code text;
update politicas_ninos t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table proveedor_amenities add column proveedor_code text;
update proveedor_amenities t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table proveedor_contactos add column proveedor_code text;
update proveedor_contactos t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table proveedor_descripciones add column proveedor_code text;
update proveedor_descripciones t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table proveedor_imagenes add column proveedor_code text;
update proveedor_imagenes t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table restricciones_fecha add column proveedor_code text;
update restricciones_fecha t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table staging_proveedor_descripciones add column proveedor_code text;
update staging_proveedor_descripciones t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table staging_proveedor_descripciones add column proveedor_sugerido_code text;
update staging_proveedor_descripciones t set proveedor_sugerido_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id_sugerido;
alter table staging_tarifas_origen add column proveedor_code text;
update staging_tarifas_origen t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table suplementos add column proveedor_code text;
update suplementos t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table tarifas_hospedaje add column proveedor_code text;
update tarifas_hospedaje t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table tarifas_programa add column proveedor_code text;
update tarifas_programa t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table tarifas_servicio add column proveedor_code text;
update tarifas_servicio t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table temporadas add column proveedor_code text;
update temporadas t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table actividades add column proveedor_code text;
update actividades t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table bloques_texto add column proveedor_code text;
update bloques_texto t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table instancia_dia_hospedajes add column proveedor_code text;
update instancia_dia_hospedajes t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;
alter table itinerario_dia_hospedajes add column proveedor_code text;
update itinerario_dia_hospedajes t set proveedor_code = p.proveedor_id from proveedores p where p.id = t.proveedor_id;

alter table contratos_tarifa drop constraint contratos_tarifa_proveedor_id_fkey;
alter table habitaciones drop constraint habitaciones_proveedor_id_fkey;
alter table politicas_cortesia drop constraint politicas_cortesia_proveedor_id_fkey;
alter table politicas_fiscales drop constraint politicas_fiscales_proveedor_id_fkey;
alter table politicas_ninos drop constraint politicas_ninos_proveedor_id_fkey;
alter table proveedor_amenities drop constraint proveedor_amenities_proveedor_id_fkey;
alter table proveedor_contactos drop constraint proveedor_contactos_proveedor_id_fkey;
alter table proveedor_descripciones drop constraint proveedor_descripciones_proveedor_id_fkey;
alter table proveedor_imagenes drop constraint proveedor_imagenes_proveedor_id_fkey;
alter table restricciones_fecha drop constraint restricciones_fecha_proveedor_id_fkey;
alter table staging_proveedor_descripciones drop constraint staging_proveedor_descripciones_proveedor_id_fkey;
alter table staging_proveedor_descripciones drop constraint staging_proveedor_descripciones_proveedor_id_sugerido_fkey;
alter table staging_tarifas_origen drop constraint staging_tarifas_origen_proveedor_id_fkey;
alter table suplementos drop constraint suplementos_proveedor_id_fkey;
alter table tarifas_hospedaje drop constraint tarifas_hospedaje_proveedor_id_fkey;
alter table tarifas_programa drop constraint tarifas_programa_proveedor_id_fkey;
alter table tarifas_servicio drop constraint tarifas_servicio_proveedor_id_fkey;
alter table temporadas drop constraint temporadas_proveedor_id_fkey;
alter table actividades drop constraint actividades_proveedor_id_fkey;
alter table bloques_texto drop constraint bloques_texto_proveedor_id_fkey;
alter table instancia_dia_hospedajes drop constraint instancia_dia_hospedajes_proveedor_id_fkey;
alter table itinerario_dia_hospedajes drop constraint itinerario_dia_hospedajes_proveedor_id_fkey;

alter table contratos_tarifa drop column proveedor_id;
alter table contratos_tarifa rename column proveedor_code to proveedor_id;
alter table habitaciones drop column proveedor_id;
alter table habitaciones rename column proveedor_code to proveedor_id;
alter table politicas_cortesia drop column proveedor_id;
alter table politicas_cortesia rename column proveedor_code to proveedor_id;
alter table politicas_fiscales drop column proveedor_id;
alter table politicas_fiscales rename column proveedor_code to proveedor_id;
alter table politicas_ninos drop column proveedor_id;
alter table politicas_ninos rename column proveedor_code to proveedor_id;
alter table proveedor_amenities drop column proveedor_id;
alter table proveedor_amenities rename column proveedor_code to proveedor_id;
alter table proveedor_contactos drop column proveedor_id;
alter table proveedor_contactos rename column proveedor_code to proveedor_id;
alter table proveedor_descripciones drop column proveedor_id;
alter table proveedor_descripciones rename column proveedor_code to proveedor_id;
alter table proveedor_imagenes drop column proveedor_id;
alter table proveedor_imagenes rename column proveedor_code to proveedor_id;
alter table restricciones_fecha drop column proveedor_id;
alter table restricciones_fecha rename column proveedor_code to proveedor_id;
alter table staging_proveedor_descripciones drop column proveedor_id;
alter table staging_proveedor_descripciones rename column proveedor_code to proveedor_id;
alter table staging_proveedor_descripciones drop column proveedor_id_sugerido;
alter table staging_proveedor_descripciones rename column proveedor_sugerido_code to proveedor_id_sugerido;
alter table staging_tarifas_origen drop column proveedor_id;
alter table staging_tarifas_origen rename column proveedor_code to proveedor_id;
alter table suplementos drop column proveedor_id;
alter table suplementos rename column proveedor_code to proveedor_id;
alter table tarifas_hospedaje drop column proveedor_id;
alter table tarifas_hospedaje rename column proveedor_code to proveedor_id;
alter table tarifas_programa drop column proveedor_id;
alter table tarifas_programa rename column proveedor_code to proveedor_id;
alter table tarifas_servicio drop column proveedor_id;
alter table tarifas_servicio rename column proveedor_code to proveedor_id;
alter table temporadas drop column proveedor_id;
alter table temporadas rename column proveedor_code to proveedor_id;
alter table actividades drop column proveedor_id;
alter table actividades rename column proveedor_code to proveedor_id;
alter table bloques_texto drop column proveedor_id;
alter table bloques_texto rename column proveedor_code to proveedor_id;
alter table instancia_dia_hospedajes drop column proveedor_id;
alter table instancia_dia_hospedajes rename column proveedor_code to proveedor_id;
alter table itinerario_dia_hospedajes drop column proveedor_id;
alter table itinerario_dia_hospedajes rename column proveedor_code to proveedor_id;

alter table proveedores drop constraint proveedores_pkey;
alter table proveedores drop column id;
alter table proveedores add primary key (proveedor_id);

alter table contratos_tarifa add constraint contratos_tarifa_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table habitaciones add constraint habitaciones_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table politicas_cortesia add constraint politicas_cortesia_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table politicas_fiscales add constraint politicas_fiscales_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table politicas_ninos add constraint politicas_ninos_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table proveedor_amenities add constraint proveedor_amenities_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table proveedor_contactos add constraint proveedor_contactos_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table proveedor_descripciones add constraint proveedor_descripciones_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table proveedor_imagenes add constraint proveedor_imagenes_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table restricciones_fecha add constraint restricciones_fecha_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table staging_proveedor_descripciones add constraint staging_proveedor_descripciones_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete set null;
alter table staging_proveedor_descripciones add constraint staging_proveedor_descripciones_proveedor_id_sugerido_fkey foreign key (proveedor_id_sugerido) references proveedores(proveedor_id) on delete set null;
alter table staging_tarifas_origen add constraint staging_tarifas_origen_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete set null;
alter table suplementos add constraint suplementos_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table tarifas_hospedaje add constraint tarifas_hospedaje_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table tarifas_programa add constraint tarifas_programa_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table tarifas_servicio add constraint tarifas_servicio_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table temporadas add constraint temporadas_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete cascade;
alter table actividades add constraint actividades_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete set null;
alter table bloques_texto add constraint bloques_texto_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete set null;
alter table instancia_dia_hospedajes add constraint instancia_dia_hospedajes_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete restrict;
alter table itinerario_dia_hospedajes add constraint itinerario_dia_hospedajes_proveedor_id_fkey foreign key (proveedor_id) references proveedores(proveedor_id) on delete restrict;


-- 3.3 habitaciones ------------------------------------------------------------
alter table habitaciones add column habitacion_id text;
with numbered as (select id, row_number() over (order by created_at) rn from habitaciones)
update habitaciones h set habitacion_id = 'HAB' || lpad(numbered.rn::text,4,'0')
from numbered where numbered.id = h.id;
alter table habitaciones alter column habitacion_id set not null;

alter table tarifas_hospedaje add column habitacion_code text;
update tarifas_hospedaje t set habitacion_code = h.habitacion_id from habitaciones h where h.id = t.habitacion_id;
alter table instancia_dia_hospedajes add column habitacion_code text;
update instancia_dia_hospedajes t set habitacion_code = h.habitacion_id from habitaciones h where h.id = t.habitacion_id;
alter table itinerario_dia_hospedajes add column habitacion_code text;
update itinerario_dia_hospedajes t set habitacion_code = h.habitacion_id from habitaciones h where h.id = t.habitacion_id;

alter table tarifas_hospedaje drop constraint tarifas_hospedaje_habitacion_id_fkey;
alter table instancia_dia_hospedajes drop constraint instancia_dia_hospedajes_habitacion_id_fkey;
alter table itinerario_dia_hospedajes drop constraint itinerario_dia_hospedajes_habitacion_id_fkey;

alter table tarifas_hospedaje drop column habitacion_id;
alter table tarifas_hospedaje rename column habitacion_code to habitacion_id;
alter table instancia_dia_hospedajes drop column habitacion_id;
alter table instancia_dia_hospedajes rename column habitacion_code to habitacion_id;
alter table itinerario_dia_hospedajes drop column habitacion_id;
alter table itinerario_dia_hospedajes rename column habitacion_code to habitacion_id;

alter table habitaciones drop constraint habitaciones_pkey;
alter table habitaciones drop column id;
alter table habitaciones add primary key (habitacion_id);

alter table tarifas_hospedaje add constraint tarifas_hospedaje_habitacion_id_fkey foreign key (habitacion_id) references habitaciones(habitacion_id) on delete cascade;
alter table instancia_dia_hospedajes add constraint instancia_dia_hospedajes_habitacion_id_fkey foreign key (habitacion_id) references habitaciones(habitacion_id) on delete restrict;
alter table itinerario_dia_hospedajes add constraint itinerario_dia_hospedajes_habitacion_id_fkey foreign key (habitacion_id) references habitaciones(habitacion_id) on delete restrict;


-- 3.4 contratos_tarifa ---------------------------------------------------------
alter table contratos_tarifa add column contrato_id text;
with numbered as (select id, row_number() over (order by created_at) rn from contratos_tarifa)
update contratos_tarifa c set contrato_id = 'CON' || lpad(numbered.rn::text,4,'0')
from numbered where numbered.id = c.id;
alter table contratos_tarifa alter column contrato_id set not null;

alter table politicas_cortesia add column contrato_code text;
update politicas_cortesia t set contrato_code = c.contrato_id from contratos_tarifa c where c.id = t.contrato_id;
alter table politicas_fiscales add column contrato_code text;
update politicas_fiscales t set contrato_code = c.contrato_id from contratos_tarifa c where c.id = t.contrato_id;
alter table politicas_ninos add column contrato_code text;
update politicas_ninos t set contrato_code = c.contrato_id from contratos_tarifa c where c.id = t.contrato_id;
alter table restricciones_fecha add column contrato_code text;
update restricciones_fecha t set contrato_code = c.contrato_id from contratos_tarifa c where c.id = t.contrato_id;
alter table suplementos add column contrato_code text;
update suplementos t set contrato_code = c.contrato_id from contratos_tarifa c where c.id = t.contrato_id;
alter table tarifas_hospedaje add column contrato_code text;
update tarifas_hospedaje t set contrato_code = c.contrato_id from contratos_tarifa c where c.id = t.contrato_id;
alter table tarifas_programa add column contrato_code text;
update tarifas_programa t set contrato_code = c.contrato_id from contratos_tarifa c where c.id = t.contrato_id;
alter table tarifas_servicio add column contrato_code text;
update tarifas_servicio t set contrato_code = c.contrato_id from contratos_tarifa c where c.id = t.contrato_id;

alter table politicas_cortesia drop constraint politicas_cortesia_contrato_id_fkey;
alter table politicas_fiscales drop constraint politicas_fiscales_contrato_id_fkey;
alter table politicas_ninos drop constraint politicas_ninos_contrato_id_fkey;
alter table restricciones_fecha drop constraint restricciones_fecha_contrato_id_fkey;
alter table suplementos drop constraint suplementos_contrato_id_fkey;
alter table tarifas_hospedaje drop constraint tarifas_hospedaje_contrato_id_fkey;
alter table tarifas_programa drop constraint tarifas_programa_contrato_id_fkey;
alter table tarifas_servicio drop constraint tarifas_servicio_contrato_id_fkey;

alter table politicas_cortesia drop column contrato_id;
alter table politicas_cortesia rename column contrato_code to contrato_id;
alter table politicas_fiscales drop column contrato_id;
alter table politicas_fiscales rename column contrato_code to contrato_id;
alter table politicas_ninos drop column contrato_id;
alter table politicas_ninos rename column contrato_code to contrato_id;
alter table restricciones_fecha drop column contrato_id;
alter table restricciones_fecha rename column contrato_code to contrato_id;
alter table suplementos drop column contrato_id;
alter table suplementos rename column contrato_code to contrato_id;
alter table tarifas_hospedaje drop column contrato_id;
alter table tarifas_hospedaje rename column contrato_code to contrato_id;
alter table tarifas_programa drop column contrato_id;
alter table tarifas_programa rename column contrato_code to contrato_id;
alter table tarifas_servicio drop column contrato_id;
alter table tarifas_servicio rename column contrato_code to contrato_id;

alter table contratos_tarifa drop constraint contratos_tarifa_pkey;
alter table contratos_tarifa drop column id;
alter table contratos_tarifa add primary key (contrato_id);

alter table politicas_cortesia add constraint politicas_cortesia_contrato_id_fkey foreign key (contrato_id) references contratos_tarifa(contrato_id) on delete cascade;
alter table politicas_fiscales add constraint politicas_fiscales_contrato_id_fkey foreign key (contrato_id) references contratos_tarifa(contrato_id) on delete cascade;
alter table politicas_ninos add constraint politicas_ninos_contrato_id_fkey foreign key (contrato_id) references contratos_tarifa(contrato_id) on delete cascade;
alter table restricciones_fecha add constraint restricciones_fecha_contrato_id_fkey foreign key (contrato_id) references contratos_tarifa(contrato_id) on delete cascade;
alter table suplementos add constraint suplementos_contrato_id_fkey foreign key (contrato_id) references contratos_tarifa(contrato_id) on delete cascade;
alter table tarifas_hospedaje add constraint tarifas_hospedaje_contrato_id_fkey foreign key (contrato_id) references contratos_tarifa(contrato_id) on delete cascade;
alter table tarifas_programa add constraint tarifas_programa_contrato_id_fkey foreign key (contrato_id) references contratos_tarifa(contrato_id) on delete cascade;
alter table tarifas_servicio add constraint tarifas_servicio_contrato_id_fkey foreign key (contrato_id) references contratos_tarifa(contrato_id) on delete cascade;


-- 3.5 temporadas y amenities (ambas vacias: solo se ajusta tipo/nombre) -------
alter table tarifas_hospedaje drop constraint tarifas_hospedaje_temporada_id_fkey;
alter table tarifas_programa drop constraint tarifas_programa_temporada_id_fkey;
alter table tarifas_servicio drop constraint tarifas_servicio_temporada_id_fkey;

alter table temporadas drop constraint temporadas_pkey;
alter table temporadas drop column id;
alter table temporadas add column temporada_id text primary key default null;
alter table temporadas alter column temporada_id drop default;

alter table tarifas_hospedaje alter column temporada_id type text using null;
alter table tarifas_programa alter column temporada_id type text using null;
alter table tarifas_servicio alter column temporada_id type text using null;

alter table tarifas_hospedaje add constraint tarifas_hospedaje_temporada_id_fkey foreign key (temporada_id) references temporadas(temporada_id) on delete set null;
alter table tarifas_programa add constraint tarifas_programa_temporada_id_fkey foreign key (temporada_id) references temporadas(temporada_id) on delete set null;
alter table tarifas_servicio add constraint tarifas_servicio_temporada_id_fkey foreign key (temporada_id) references temporadas(temporada_id) on delete set null;

alter table proveedor_amenities drop constraint proveedor_amenities_amenity_id_fkey;
alter table amenities drop constraint amenities_pkey;
alter table amenities drop column id;
alter table amenities add column amenity_id text primary key default null;
alter table amenities alter column amenity_id drop default;
alter table proveedor_amenities alter column amenity_id type text using null;
alter table proveedor_amenities add constraint proveedor_amenities_amenity_id_fkey foreign key (amenity_id) references amenities(amenity_id) on delete cascade;


-- 3.6 tablas hoja (sin otras tablas referenciando su PK) ----------------------
alter table proveedor_contactos add column contacto_id text;
with n as (select id, row_number() over (order by created_at) rn from proveedor_contactos)
update proveedor_contactos t set contacto_id = 'CTC' || lpad(n.rn::text,4,'0') from n where n.id = t.id;
alter table proveedor_contactos alter column contacto_id set not null;
alter table proveedor_contactos drop constraint proveedor_contactos_pkey;
alter table proveedor_contactos drop column id;
alter table proveedor_contactos add primary key (contacto_id);

alter table proveedor_descripciones add column descripcion_id text;
with n as (select id, row_number() over (order by actualizado_en) rn from proveedor_descripciones)
update proveedor_descripciones t set descripcion_id = 'DES' || lpad(n.rn::text,4,'0') from n where n.id = t.id;
alter table proveedor_descripciones alter column descripcion_id set not null;
alter table proveedor_descripciones drop constraint proveedor_descripciones_pkey;
alter table proveedor_descripciones drop column id;
alter table proveedor_descripciones add primary key (descripcion_id);

alter table proveedor_imagenes add column imagen_id text;
with n as (select id, row_number() over (order by created_at) rn from proveedor_imagenes)
update proveedor_imagenes t set imagen_id = 'IMG' || lpad(n.rn::text,4,'0') from n where n.id = t.id;
alter table proveedor_imagenes alter column imagen_id set not null;
alter table proveedor_imagenes drop constraint proveedor_imagenes_pkey;
alter table proveedor_imagenes drop column id;
alter table proveedor_imagenes add primary key (imagen_id);

alter table politicas_fiscales drop constraint politicas_fiscales_pkey;
alter table politicas_fiscales drop column id;
alter table politicas_fiscales add column pol_fiscal_id text primary key default null;
alter table politicas_fiscales alter column pol_fiscal_id drop default;

alter table politicas_ninos drop constraint politicas_ninos_pkey;
alter table politicas_ninos drop column id;
alter table politicas_ninos add column pol_nino_id text primary key default null;
alter table politicas_ninos alter column pol_nino_id drop default;

alter table politicas_cortesia drop constraint politicas_cortesia_pkey;
alter table politicas_cortesia drop column id;
alter table politicas_cortesia add column pol_cortesia_id text primary key default null;
alter table politicas_cortesia alter column pol_cortesia_id drop default;

alter table suplementos drop constraint suplementos_pkey;
alter table suplementos drop column id;
alter table suplementos add column suplemento_id text primary key default null;
alter table suplementos alter column suplemento_id drop default;

alter table restricciones_fecha drop constraint restricciones_fecha_pkey;
alter table restricciones_fecha drop column id;
alter table restricciones_fecha add column restriccion_id text primary key default null;
alter table restricciones_fecha alter column restriccion_id drop default;

-- tarifas_hospedaje (referenciada por instancia_dia_hospedajes.tarifa_id)
alter table tarifas_hospedaje add column tarifa_hosp_id text;
with n as (select id, row_number() over (order by created_at) rn from tarifas_hospedaje)
update tarifas_hospedaje t set tarifa_hosp_id = 'THO' || lpad(n.rn::text,5,'0') from n where n.id = t.id;
alter table tarifas_hospedaje alter column tarifa_hosp_id set not null;

alter table instancia_dia_hospedajes add column tarifa_code text;
update instancia_dia_hospedajes t set tarifa_code = th.tarifa_hosp_id from tarifas_hospedaje th where th.id = t.tarifa_id;
alter table instancia_dia_hospedajes drop constraint instancia_dia_hospedajes_tarifa_id_fkey;
alter table instancia_dia_hospedajes drop column tarifa_id;
alter table instancia_dia_hospedajes rename column tarifa_code to tarifa_id;

alter table tarifas_hospedaje drop constraint tarifas_hospedaje_pkey;
alter table tarifas_hospedaje drop column id;
alter table tarifas_hospedaje add primary key (tarifa_hosp_id);

alter table instancia_dia_hospedajes add constraint instancia_dia_hospedajes_tarifa_id_fkey foreign key (tarifa_id) references tarifas_hospedaje(tarifa_hosp_id) on delete set null;

alter table tarifas_programa add column tarifa_prog_id text;
with n as (select id, row_number() over (order by created_at) rn from tarifas_programa)
update tarifas_programa t set tarifa_prog_id = 'TPR' || lpad(n.rn::text,5,'0') from n where n.id = t.id;
alter table tarifas_programa alter column tarifa_prog_id set not null;
alter table tarifas_programa drop constraint tarifas_programa_pkey;
alter table tarifas_programa drop column id;
alter table tarifas_programa add primary key (tarifa_prog_id);

alter table tarifas_servicio add column tarifa_serv_id text;
with n as (select id, row_number() over (order by created_at) rn from tarifas_servicio)
update tarifas_servicio t set tarifa_serv_id = 'TSV' || lpad(n.rn::text,4,'0') from n where n.id = t.id;
alter table tarifas_servicio alter column tarifa_serv_id set not null;
alter table tarifas_servicio drop constraint tarifas_servicio_pkey;
alter table tarifas_servicio drop column id;
alter table tarifas_servicio add primary key (tarifa_serv_id);

alter table staging_tarifas_origen add column origen_id2 text;
with n as (select id, row_number() over (order by importado_en) rn from staging_tarifas_origen)
update staging_tarifas_origen t set origen_id2 = 'STO' || lpad(n.rn::text,4,'0') from n where n.id = t.id;
alter table staging_tarifas_origen alter column origen_id2 set not null;
alter table staging_tarifas_origen drop constraint staging_tarifas_origen_pkey;
alter table staging_tarifas_origen drop column id;
alter table staging_tarifas_origen rename column origen_id2 to origen_id;
alter table staging_tarifas_origen add primary key (origen_id);

alter table staging_proveedor_descripciones add column staging_desc_id text;
with n as (select id, row_number() over (order by importado_en) rn from staging_proveedor_descripciones)
update staging_proveedor_descripciones t set staging_desc_id = 'SPD' || lpad(n.rn::text,4,'0') from n where n.id = t.id;
alter table staging_proveedor_descripciones alter column staging_desc_id set not null;
alter table staging_proveedor_descripciones drop constraint staging_proveedor_descripciones_pkey;
alter table staging_proveedor_descripciones drop column id;
alter table staging_proveedor_descripciones add primary key (staging_desc_id);

-- tarifas_hospedaje/programa/servicio.origen_id era trazabilidad informal
-- (nunca fue FK con constraint) hacia staging_tarifas_origen.id. Al
-- redisenar ese PK se perdio el mapeo (el uuid viejo ya no resuelve a
-- nada); se cambia el tipo a text y se limpia el valor huerfano en vez de
-- dejar un uuid que aparenta ser valido pero ya no apunta a nada.
alter table tarifas_hospedaje alter column origen_id type text using null;
alter table tarifas_programa alter column origen_id type text using null;
alter table tarifas_servicio alter column origen_id type text using null;


-- ---------------------------------------------------------------------------
-- 4. Recrear vistas con los nombres de columna nuevos (mismo
--    security_invoker que tenian antes de dropearlas).
-- ---------------------------------------------------------------------------
create view v_tarifas_hospedaje
with (security_invoker = true) as
select
  t.tarifa_hosp_id,
  p.nombre as hotel,
  p.tipo as tipo_proveedor,
  u.provincia,
  u.ciudad,
  h.nombre as habitacion,
  h.categoria as categoria_habitacion,
  o.nombre as ocupacion,
  o.num_pax,
  pa.nombre as plan_alimentacion,
  ts.codigo as temporada,
  sg.nombre as segmento,
  t.base,
  t.precio,
  t.impuestos_incluidos,
  t.pax_min, t.pax_max,
  t.habitaciones_min, t.habitaciones_max,
  c.anio, c.fecha_desde, c.fecha_hasta, c.moneda,
  c.tipo as tipo_tarifa,
  c.es_comisionable, c.comision_pct,
  t.observaciones
from tarifas_hospedaje t
join proveedores          p  on p.proveedor_id  = t.proveedor_id
join habitaciones         h  on h.habitacion_id = t.habitacion_id
join ocupaciones          o  on o.codigo = t.ocupacion_codigo
join planes_alimentacion  pa on pa.codigo = t.plan_codigo
join contratos_tarifa     c  on c.contrato_id = t.contrato_id
left join ubicaciones     u  on u.ubicacion_id = p.ubicacion_id
left join temporadas      ts on ts.temporada_id = t.temporada_id
left join segmentos_pax   sg on sg.codigo = t.segmento_codigo;

create view v_itinerario_dias
with (security_invoker = true) as
select
  pl.codigo as itinerario,
  pl.nombre as itinerario_nombre,
  pl.tema,
  d.id as dia_id,
  d.numero_dia,
  d.titulo,
  coalesce(d.texto_override, b.cuerpo) as texto,
  (d.texto_override is not null) as texto_personalizado,
  u.ciudad,
  u.provincia,
  nullif(concat_ws('.',
    case when d.incluye_desayuno then 'B' else null end,
    case when d.incluye_almuerzo then 'L' else null end,
    case when d.incluye_cena then 'D' else null end,
    case when d.incluye_box_lunch then 'BL' else null end
  ), '') as comidas,
  d.sin_pernocte
from itinerario_dias d
join itinerarios_plantilla pl on pl.id = d.plantilla_id
left join bloques_texto b on b.id = d.bloque_texto_id
left join ubicaciones u on u.ubicacion_id = d.ubicacion_id;

create view v_costo_alojamiento_dia
with (security_invoker = true) as
select
  pl.codigo as itinerario,
  d.numero_dia,
  h.categoria_codigo,
  coalesce(pr.nombre, h.nombre_libre) as hotel,
  hab.nombre as habitacion,
  (h.habitacion_id is null) as habitacion_sin_especificar,
  th.ocupacion_codigo,
  th.plan_codigo,
  th.base,
  min(th.precio) as costo_noche,
  ct.anio as anio_contrato
from itinerario_dia_hospedajes h
join itinerario_dias d on d.id = h.dia_id
join itinerarios_plantilla pl on pl.id = d.plantilla_id
left join proveedores pr on pr.proveedor_id = h.proveedor_id
left join habitaciones hab on hab.habitacion_id = h.habitacion_id
left join tarifas_hospedaje th on (
  th.proveedor_id = h.proveedor_id
  and (h.habitacion_id is null or th.habitacion_id = h.habitacion_id)
  and (h.plan_codigo is null or th.plan_codigo = h.plan_codigo)
)
left join contratos_tarifa ct on ct.contrato_id = th.contrato_id and ct.estado = 'VIGENTE'
where not d.sin_pernocte
group by pl.codigo, d.numero_dia, h.categoria_codigo, pr.nombre, h.nombre_libre, hab.nombre, h.habitacion_id, th.ocupacion_codigo, th.plan_codigo, th.base, ct.anio;


-- ---------------------------------------------------------------------------
-- 5. Actualizar promover_hospedaje_hoja() para usar los nombres nuevos
--    (usaba "select id"/"returning id" contra columnas ya renombradas).
-- ---------------------------------------------------------------------------
create or replace function promover_hospedaje_hoja(p_hoja text, p_anio int default 2026) returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  r record;
  v_contrato_id text;
  v_habitacion_id text;
  v_room_raw text;
  v_room_nombre text;
  v_ultima_habitacion_id text;
  v_ultima_habitacion_nombre text;
  v_ultimo_proveedor text;
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
    select contrato_id into v_contrato_id from contratos_tarifa
    where proveedor_id = r.proveedor_id and anio = p_anio
    limit 1;

    if v_contrato_id is null then
      insert into contratos_tarifa (proveedor_id, anio, fecha_desde, fecha_hasta, moneda, tipo, estado, notas)
      values (r.proveedor_id, p_anio, (p_anio||'-01-01')::date, (p_anio||'-12-31')::date, 'USD', 'NETA', 'BORRADOR',
              'Contrato generado automaticamente al promover staging_tarifas_origen (hoja ' || p_hoja || '). Fechas de vigencia por confirmar.')
      returning contrato_id into v_contrato_id;
    end if;
  end loop;

  v_ultimo_proveedor := null;
  v_ultima_habitacion_id := null;
  v_ultima_habitacion_nombre := null;

  for r in
    select origen_id, proveedor_id, nombre_propagado, columnas,
      count(*) over (partition by proveedor_id) as filas_proveedor
    from staging_tarifas_origen
    where hoja = p_hoja and proveedor_id is not null
    order by fila_numero
  loop
    select contrato_id into v_contrato_id from contratos_tarifa
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

    select habitacion_id into v_habitacion_id from habitaciones
    where proveedor_id = r.proveedor_id and nombre = v_room_nombre;

    if v_habitacion_id is null then
      v_num_unidades := case
        when v_room_nombre !~ '/' and v_room_nombre ~ '\([0-9]+\)'
          then (regexp_match(v_room_nombre, '\(([0-9]+)\)'))[1]::int
        else null
      end;
      insert into habitaciones (proveedor_id, nombre, categoria, num_unidades)
      values (r.proveedor_id, v_room_nombre, inferir_categoria(v_room_nombre), v_num_unidades)
      returning habitacion_id into v_habitacion_id;
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
            (v_contrato_id, r.proveedor_id, v_habitacion_id, v_codigos[i], v_plan_codigo, 'POR_HABITACION', v_precio, v_pax_min, v_pax_max, v_observaciones, r.origen_id);
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
          select habitacion_id into v_habitacion_id from habitaciones
          where proveedor_id = r.proveedor_id and nombre = v_extra_nombre_final;
          if v_habitacion_id is null then
            insert into habitaciones (proveedor_id, nombre, categoria)
            values (r.proveedor_id, v_extra_nombre_final, inferir_categoria(v_extra_names[i]))
            returning habitacion_id into v_habitacion_id;
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
              (v_contrato_id, r.proveedor_id, v_habitacion_id, 'SGL', 'BB', 'POR_HABITACION', v_precio, r.origen_id);
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
            select habitacion_id into v_habitacion_id from habitaciones
            where proveedor_id = r.proveedor_id and nombre = v_extra_nombre_final;
            if v_habitacion_id is null then
              insert into habitaciones (proveedor_id, nombre, categoria)
              values (r.proveedor_id, v_extra_nombre_final, inferir_categoria(v_extra_names[i]))
              returning habitacion_id into v_habitacion_id;
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
                values (v_contrato_id, r.proveedor_id, v_habitacion_id, 'SGL', 'BB', 'POR_HABITACION', v_sgl, r.origen_id);
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
                values (v_contrato_id, r.proveedor_id, v_habitacion_id, 'DBL', 'BB', 'POR_HABITACION', v_dbl, r.origen_id);
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


-- ---------------------------------------------------------------------------
-- 6. Restaurar indices sobre columnas FK que se perdieron al hacer
--    drop column + add column durante el rediseño (drop column elimina
--    cualquier indice que dependa de ella).
-- ---------------------------------------------------------------------------
create index on proveedores (ubicacion_id);
create index on habitaciones (proveedor_id);
create index on contratos_tarifa (proveedor_id);
create index on tarifas_hospedaje (proveedor_id);
create index on tarifas_hospedaje (habitacion_id);
create index on tarifas_hospedaje (contrato_id);
create index on tarifas_programa (proveedor_id);
create index on tarifas_programa (contrato_id);
create index on tarifas_servicio (proveedor_id);
create index on tarifas_servicio (contrato_id);
create index on proveedor_contactos (proveedor_id);
create index on proveedor_descripciones (proveedor_id);
create index on proveedor_imagenes (proveedor_id, orden);
create index on politicas_cortesia (proveedor_id);
create index on politicas_fiscales (proveedor_id);
create index on politicas_ninos (proveedor_id);
create index on restricciones_fecha (proveedor_id);
create index on suplementos (proveedor_id);
create index on temporadas (proveedor_id);
create index on staging_tarifas_origen (proveedor_id);
create index on staging_proveedor_descripciones (proveedor_id_sugerido);

create index on actividades (proveedor_id);
create index on actividades (ubicacion_id);
create index on bloques_texto (proveedor_id);
create index on bloques_texto (ubicacion_id);
create index on instancia_dia_hospedajes (proveedor_id);
create index on instancia_dia_hospedajes (habitacion_id);
create index on instancia_dia_hospedajes (tarifa_id);
create index on itinerario_dia_hospedajes (proveedor_id);
create index on itinerario_dia_hospedajes (habitacion_id);
create index on instancia_dias (ubicacion_id);
create index on itinerario_dias (ubicacion_id);
