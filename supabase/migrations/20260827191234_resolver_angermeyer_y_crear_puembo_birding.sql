-- ============================================================================
-- Resolucion manual de las 2 fotos que quedaron sin proveedor tras el match
-- automatico (exacto + fuzzy) de carga_proveedor_imagenes*:
--
-- 1) Angermeyer Waterfront Inn: SI es "ANGERMEYER (Sta Cruz)" (confirmado por
--    el usuario). El nombre canonico en `proveedores` se corrige al nombre
--    real del documento fuente (Hoteles Foto / docx), que es el que se usa
--    para nombrar en la mayoria de los casos ya promovidos.
--
-- 2) Puembo Birding Garden Bed and Breakfast: no existe todavia como
--    proveedor (su nombre_md en staging quedo corrupto -- capturo la
--    descripcion en vez del nombre -- y por eso nunca goteo a `proveedores`).
--    Se crea el proveedor con nombre+descripcion+foto para no perder el
--    dato, pero sin contrato/tarifas: queda pendiente de que aparezca en el
--    Excel de tarifas o se le asigne una manualmente.
-- ============================================================================

-- 1) Angermeyer -----------------------------------------------------------
update proveedores
   set nombre = 'Angermeyer Waterfront Inn'
 where id = '7a3b9974-c9ae-4687-b300-4274f7f9aa96';

update staging_proveedor_descripciones
   set proveedor_id = '7a3b9974-c9ae-4687-b300-4274f7f9aa96',
       estado = 'REVISADO'
 where id = 'c6372c43-431a-4650-9c8d-2ac97efeca7a';

insert into proveedor_descripciones (proveedor_id, idioma, descripcion, fuente)
select proveedor_id, idioma, descripcion, fuente
from staging_proveedor_descripciones
where id = 'c6372c43-431a-4650-9c8d-2ac97efeca7a'
on conflict (proveedor_id, idioma) do nothing;

insert into proveedor_imagenes (proveedor_id, storage_path, titulo, formato, orden, es_principal)
select '7a3b9974-c9ae-4687-b300-4274f7f9aa96', 'Fotos Hoteles/Angermeyer Waterfront Inn.png',
       'Angermeyer Waterfront Inn', 'png', 0, true
where not exists (
  select 1 from proveedor_imagenes
  where proveedor_id = '7a3b9974-c9ae-4687-b300-4274f7f9aa96'
    and storage_path = 'Fotos Hoteles/Angermeyer Waterfront Inn.png'
);

-- 2) Puembo Birding Garden --------------------------------------------------
do $$
declare
  v_proveedor_id uuid;
  v_staging_id uuid := 'bcfa0ab7-054f-448f-a6ea-1a17670356b8';
begin
  select id into v_proveedor_id from proveedores
  where codigo = 'norte-Puembo-Birding-Garden';

  if v_proveedor_id is null then
    insert into proveedores (codigo, nombre, tipo, ubicacion_id)
    values (
      'norte-Puembo-Birding-Garden',
      'Puembo Birding Garden Bed and Breakfast',
      'HOTEL',
      'ebfe6bf6-bcd9-473d-a8ae-81ebcd7f3a8f'
    )
    returning id into v_proveedor_id;
  end if;

  update staging_proveedor_descripciones
     set proveedor_id = v_proveedor_id,
         estado = 'REVISADO'
   where id = v_staging_id;

  insert into proveedor_descripciones (proveedor_id, idioma, descripcion, fuente)
  select v_proveedor_id, idioma, descripcion, fuente
  from staging_proveedor_descripciones
  where id = v_staging_id
  on conflict (proveedor_id, idioma) do nothing;

  insert into proveedor_imagenes (proveedor_id, storage_path, titulo, formato, orden, es_principal)
  select v_proveedor_id, 'Fotos Hoteles/Puembo Birding Garden Bed and Breakfast.png',
         'Puembo Birding Garden Bed and Breakfast', 'png', 0, true
  where not exists (
    select 1 from proveedor_imagenes
    where proveedor_id = v_proveedor_id
      and storage_path = 'Fotos Hoteles/Puembo Birding Garden Bed and Breakfast.png'
  );
end $$;
