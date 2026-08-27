-- ============================================================================
-- 2 fotos mas que el matching automatico (exacto + fuzzy) no resolvio:
--
-- 1) Swissotel Quito: staging la sugeria contra "Hotel Quito" (similitud
--    0.400, nunca aprobada -- seguia PENDIENTE). El proveedor real es
--    "Swissotel" (id 7e98b989). Se corrige el nombre canonico al nombre del
--    documento fuente, igual que con Angermeyer.
--
-- 2) Mansion Santa Isabella: YA estaba resuelta en staging (REVISADO,
--    proveedor_id = Mansión Sta. Isabella) desde la promocion original; solo
--    faltaba insertar la fila en proveedor_imagenes porque el nombre_md
--    traia un caracter suelto ("Mansión Santa Isabella i") que rompia el
--    match normalizado.
-- ============================================================================

update proveedores
   set nombre = 'Swissotel Quito'
 where id = '7e98b989-2dde-4054-b1d1-36781472b32c';

update staging_proveedor_descripciones
   set proveedor_id = '7e98b989-2dde-4054-b1d1-36781472b32c',
       estado = 'REVISADO'
 where nombre_md = 'Swissôtel Quito';

insert into proveedor_descripciones (proveedor_id, idioma, descripcion, fuente)
select proveedor_id, idioma, descripcion, fuente
from staging_proveedor_descripciones
where nombre_md = 'Swissôtel Quito'
on conflict (proveedor_id, idioma) do nothing;

insert into proveedor_imagenes (proveedor_id, storage_path, titulo, formato, orden, es_principal)
select '7e98b989-2dde-4054-b1d1-36781472b32c', 'Fotos Hoteles/Swissotel Quito.jpeg',
       'Swissotel Quito', 'jpeg', 0, true
where not exists (
  select 1 from proveedor_imagenes
  where proveedor_id = '7e98b989-2dde-4054-b1d1-36781472b32c'
    and storage_path = 'Fotos Hoteles/Swissotel Quito.jpeg'
);

insert into proveedor_imagenes (proveedor_id, storage_path, titulo, formato, orden, es_principal)
select '0ef541c0-9bb2-4907-8056-d7bf3262bfd0', 'Fotos Hoteles/Mansion Santa Isabella.jpeg',
       'Mansion Santa Isabella', 'jpeg', 0, true
where not exists (
  select 1 from proveedor_imagenes
  where proveedor_id = '0ef541c0-9bb2-4907-8056-d7bf3262bfd0'
    and storage_path = 'Fotos Hoteles/Mansion Santa Isabella.jpeg'
);
