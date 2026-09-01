-- ============================================================================
-- PROMOCIÓN: staging_tarifas_origen → ubicaciones + proveedores + proveedor_contactos
--
-- Primera fase de la promoción descrita en el comentario de cabecera de
-- 20260825000000_esquema_tarifario.sql: "se cargan primero en
-- staging_tarifas_origen sin transformar, y desde ahí se promueven a las
-- dimensiones y hechos de este esquema".
--
-- Alcance de esta migración: sólo la entidad maestra (proveedores) y su
-- ubicación/contacto. Habitaciones, tarifas_hospedaje, tarifas_programa,
-- tarifas_servicio y políticas se abordan en una migración posterior porque
-- requieren parsear 20 layouts de encabezado distintos por hoja.
--
-- Idempotente: puede re-ejecutarse sin duplicar filas (upsert por codigo /
-- por (proveedor_id, idioma) etc.).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. UBICACIONES — mapeo (hoja, bloque) → región/provincia/ciudad
-- ---------------------------------------------------------------------------
with mapa_ubicacion (hoja, bloque, region, provincia, ciudad) as (
  values
    ('BARCOS',       null,                                 'Galápagos',          'Galápagos',        null),
    ('CENTRO-SUR',   'TARIFAS HOTELES CHIMBORAZO',          'Sierra Centro-Sur',  'Chimborazo',        'Riobamba'),
    ('CENTRO-SUR',   'TARIFAS HOTELES CUENCA',              'Sierra Centro-Sur',  'Azuay',             'Cuenca'),
    ('CENTRO-SUR',   'TARIFAS HOTELES LOJA',                'Sierra Centro-Sur',  'Loja',              'Loja'),
    ('CLOUDFOREST',  'TARIFAS FUNDACIÓN JOCOTOCO',          'Bosque Nublado',     'Pichincha',         null),
    ('CLOUDFOREST',  'TARIFAS HOTELES CLOUD FOREST EAST',   'Bosque Nublado',     'Napo',              null),
    ('CLOUDFOREST',  'TARIFAS HOTELES CLOUD FOREST WEST',   'Bosque Nublado',     'Pichincha',         'Mindo'),
    ('COSTA',        'TARIFAS HOTELES GUAYAQUIL',           'Costa',              'Guayas',            'Guayaquil'),
    ('COSTA',        'TARIFAS HOTELES MACHALILLA',          'Costa',              'Manabí',            'Puerto López'),
    ('COSTA',        'TARIFAS HOTELES MANTA',               'Costa',              'Manabí',            'Manta'),
    ('COSTA',        'TARIFAS HOTELES SANTA ELENA',         'Costa',              'Santa Elena',       null),
    ('COSTA',        'TARIFAS OTROS HOTELES',               'Costa',              null,                null),
    ('GALAPAGOS',    'ISABELA',                             'Galápagos',          'Galápagos',         'Isabela'),
    ('GALAPAGOS',    'SAN CRISTOBAL',                       'Galápagos',          'Galápagos',         'San Cristóbal'),
    ('GALAPAGOS',    'SANTA CRUZ',                          'Galápagos',          'Galápagos',         'Santa Cruz'),
    ('NORTE',        'FUERA DE LA CIUDAD',                  'Sierra Norte',       'Pichincha',         null),
    ('NORTE',        'TARIFAS HOTELES COTOPAXI',            'Sierra Norte',       'Cotopaxi',          null),
    ('NORTE',        'TARIFAS HOTELES IMBABURA',            'Sierra Norte',       'Imbabura',          null),
    ('NORTE',        'TARIFAS HOTELES TUNGURAHUA',          'Sierra Norte',       'Tungurahua',        'Baños'),
    ('NORTE',        null,                                  'Sierra Norte',       'Pichincha',         'Quito'),
    ('RAINFOREST',   'HOTELES COCA',                        'Amazonía',           'Orellana',          'Coca'),
    ('RAINFOREST',   'HOTELES MACAS',                       'Amazonía',           'Morona Santiago',   'Macas'),
    ('RAINFOREST',   null,                                  'Amazonía',           null,                null),
    ('RESTAURANTE',  'CUENCA',                              'Sierra Centro-Sur',  'Azuay',             'Cuenca'),
    ('RESTAURANTE',  'GALAPAGOS',                           'Galápagos',          'Galápagos',         null),
    ('RESTAURANTE',  'GUAYAQUIL',                           'Costa',              'Guayas',            'Guayaquil'),
    ('RESTAURANTE',  'IMBABURA',                            'Sierra Norte',       'Imbabura',          null),
    ('RESTAURANTE',  'LA BELLE EPOQUE',                     'Sierra Norte',       null,                null),
    ('RESTAURANTE',  'QUITO',                               'Sierra Norte',       'Pichincha',         'Quito'),
    ('RESTAURANTE',  'TUNGURAHUA',                          'Sierra Norte',       'Tungurahua',        'Baños')
),
insertadas as (
  insert into ubicaciones (region, provincia, ciudad)
  select distinct region, provincia, ciudad from mapa_ubicacion
  on conflict (pais, region, provincia, ciudad, zona) do nothing
  returning id, region, provincia, ciudad
)
select 1;

-- ---------------------------------------------------------------------------
-- 2. PROVEEDORES — un proveedor por (hoja, nombre_propagado)
-- ---------------------------------------------------------------------------
with mapa_ubicacion (hoja, bloque, region, provincia, ciudad) as (
  values
    ('BARCOS',       null,                                 'Galápagos',          'Galápagos',        null),
    ('CENTRO-SUR',   'TARIFAS HOTELES CHIMBORAZO',          'Sierra Centro-Sur',  'Chimborazo',        'Riobamba'),
    ('CENTRO-SUR',   'TARIFAS HOTELES CUENCA',              'Sierra Centro-Sur',  'Azuay',             'Cuenca'),
    ('CENTRO-SUR',   'TARIFAS HOTELES LOJA',                'Sierra Centro-Sur',  'Loja',              'Loja'),
    ('CLOUDFOREST',  'TARIFAS FUNDACIÓN JOCOTOCO',          'Bosque Nublado',     'Pichincha',         null),
    ('CLOUDFOREST',  'TARIFAS HOTELES CLOUD FOREST EAST',   'Bosque Nublado',     'Napo',              null),
    ('CLOUDFOREST',  'TARIFAS HOTELES CLOUD FOREST WEST',   'Bosque Nublado',     'Pichincha',         'Mindo'),
    ('COSTA',        'TARIFAS HOTELES GUAYAQUIL',           'Costa',              'Guayas',            'Guayaquil'),
    ('COSTA',        'TARIFAS HOTELES MACHALILLA',          'Costa',              'Manabí',            'Puerto López'),
    ('COSTA',        'TARIFAS HOTELES MANTA',               'Costa',              'Manabí',            'Manta'),
    ('COSTA',        'TARIFAS HOTELES SANTA ELENA',         'Costa',              'Santa Elena',       null),
    ('COSTA',        'TARIFAS OTROS HOTELES',               'Costa',              null,                null),
    ('GALAPAGOS',    'ISABELA',                             'Galápagos',          'Galápagos',         'Isabela'),
    ('GALAPAGOS',    'SAN CRISTOBAL',                       'Galápagos',          'Galápagos',         'San Cristóbal'),
    ('GALAPAGOS',    'SANTA CRUZ',                          'Galápagos',          'Galápagos',         'Santa Cruz'),
    ('NORTE',        'FUERA DE LA CIUDAD',                  'Sierra Norte',       'Pichincha',         null),
    ('NORTE',        'TARIFAS HOTELES COTOPAXI',            'Sierra Norte',       'Cotopaxi',          null),
    ('NORTE',        'TARIFAS HOTELES IMBABURA',            'Sierra Norte',       'Imbabura',          null),
    ('NORTE',        'TARIFAS HOTELES TUNGURAHUA',          'Sierra Norte',       'Tungurahua',        'Baños'),
    ('NORTE',        null,                                  'Sierra Norte',       'Pichincha',         'Quito'),
    ('RAINFOREST',   'HOTELES COCA',                        'Amazonía',           'Orellana',          'Coca'),
    ('RAINFOREST',   'HOTELES MACAS',                       'Amazonía',           'Morona Santiago',   'Macas'),
    ('RAINFOREST',   null,                                  'Amazonía',           null,                null),
    ('RESTAURANTE',  'CUENCA',                              'Sierra Centro-Sur',  'Azuay',             'Cuenca'),
    ('RESTAURANTE',  'GALAPAGOS',                           'Galápagos',          'Galápagos',         null),
    ('RESTAURANTE',  'GUAYAQUIL',                           'Costa',              'Guayas',            'Guayaquil'),
    ('RESTAURANTE',  'IMBABURA',                            'Sierra Norte',       'Imbabura',          null),
    ('RESTAURANTE',  'LA BELLE EPOQUE',                     'Sierra Norte',       null,                null),
    ('RESTAURANTE',  'QUITO',                               'Sierra Norte',       'Pichincha',         'Quito'),
    ('RESTAURANTE',  'TUNGURAHUA',                          'Sierra Norte',       'Tungurahua',        'Baños')
),
grupos as (
  select
    s.hoja,
    s.nombre_propagado,
    min(s.fila_numero)                                              as primera_fila,
    coalesce(
      (array_agg(s.nombre_crudo order by s.fila_numero) filter (where s.nombre_crudo is not null))[1],
      s.nombre_propagado
    )                                                                as nombre_excel,
    coalesce(
      (array_agg(s.bloque order by s.fila_numero) filter (where s.bloque is not null))[1],
      null
    )                                                                as bloque_rep,
    (array_agg(s.email order by s.fila_numero) filter (where s.email is not null))[1] as email_rep
  from staging_tarifas_origen s
  where s.nombre_propagado is not null
  group by s.hoja, s.nombre_propagado
),
con_tipo as (
  select
    g.*,
    regexp_replace(
      regexp_replace(g.nombre_propagado, '\s*iva\s*0?\s*%\s*$', '', 'i'),
      '\s+', ' ', 'g'
    )                                                                as nombre_limpio,
    case
      when g.hoja = 'BARCOS'      then 'BARCO'
      when g.hoja = 'RESTAURANTE' then 'RESTAURANTE'
      when g.nombre_propagado ~* 'hacienda' then 'HACIENDA'
      when g.nombre_propagado ~* 'lodge'    then 'LODGE'
      when g.nombre_propagado ~* 'hoster'   then 'HOSTERIA'
      else 'HOTEL'
    end::tipo_proveedor                                             as tipo,
    m.region, m.provincia, m.ciudad
  from grupos g
  left join mapa_ubicacion m
    on m.hoja = g.hoja
   and m.bloque is not distinct from g.bloque_rep
),
con_ubicacion as (
  select
    ct.*,
    u.id as ubicacion_id
  from con_tipo ct
  left join ubicaciones u
    on u.region     is not distinct from ct.region
   and u.provincia  is not distinct from ct.provincia
   and u.ciudad     is not distinct from ct.ciudad
   and u.zona       is null
),
insertados as (
  insert into proveedores (codigo, nombre, nombre_excel, tipo, ubicacion_id)
  select
    lower(ct.hoja) || '-' ||
      regexp_replace(regexp_replace(trim(ct.nombre_limpio), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')
                                                        as codigo,
    trim(ct.nombre_limpio)                              as nombre,
    ct.nombre_excel,
    ct.tipo,
    ct.ubicacion_id
  from con_ubicacion ct
  on conflict (codigo) do nothing
  returning id, codigo
)
select count(*) as proveedores_insertados from insertados;

-- ---------------------------------------------------------------------------
-- 3. TRAZABILIDAD — vincula cada fila de staging a su proveedor
-- ---------------------------------------------------------------------------
update staging_tarifas_origen s
set proveedor_id = p.id
from proveedores p
where s.nombre_propagado is not null
  and p.codigo = lower(s.hoja) || '-' ||
      regexp_replace(
        regexp_replace(
          trim(regexp_replace(
            regexp_replace(s.nombre_propagado, '\s*iva\s*0?\s*%\s*$', '', 'i'),
            '\s+', ' ', 'g'
          )),
          '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-+|-+$)', '', 'g')
  and s.proveedor_id is null;

-- ---------------------------------------------------------------------------
-- 4. CONTACTOS — un correo principal por proveedor cuando está disponible
-- ---------------------------------------------------------------------------
with rep as (
  select distinct on (s.proveedor_id)
    s.proveedor_id, s.email
  from staging_tarifas_origen s
  where s.proveedor_id is not null and s.email is not null
  order by s.proveedor_id, s.fila_numero
)
insert into proveedor_contactos (proveedor_id, email, es_principal)
select r.proveedor_id, r.email, true
from rep r
where not exists (
  select 1 from proveedor_contactos pc
  where pc.proveedor_id = r.proveedor_id and pc.email = r.email
);
