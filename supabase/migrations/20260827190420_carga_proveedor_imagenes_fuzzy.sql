-- ============================================================================
-- CARGA (fuzzy): resolver proveedor_id de las fotos que la migracion anterior
-- (carga_proveedor_imagenes) no pudo matchear por coincidencia exacta.
--
-- La comparacion exacta contra staging_proveedor_descripciones.nombre_md y
-- proveedores.nombre dejo 55 de 149 fotos sin proveedor_id: la mayoria son
-- diferencias de mayusculas/minusculas, tildes (Pinsaqui vs Pinsaquí) o
-- puntuacion (Casa dCampo vs Casa d'Campo). Se agrega norm_nombre() para
-- normalizar (minusculas + sin tildes + solo alfanumerico) y volver a
-- intentar el mismo match en dos pasos.
-- ============================================================================

create or replace function norm_nombre(t text) returns text
language sql immutable
set search_path = ''
as $$
  select lower(regexp_replace(translate(t, 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouAEIOUnNuU'), '[^a-zA-Z0-9]+', '', 'g'))
$$;

create temp table stg_fotos (
  nombre_md    text not null,
  storage_path text not null,
  formato      text not null
) on commit drop;

insert into stg_fotos (nombre_md, storage_path, formato) values
  ('La Rabida Hostal', 'Fotos Hoteles/La Rabida Hostal.jpeg', 'jpeg'),
  ('Hotel San Francisco de Quito', 'Fotos Hoteles/Hotel San Francisco de Quito.png', 'png'),
  ('La Casa Sol', 'Fotos Hoteles/La Casa Sol.png', 'png'),
  ('The Hotel Patio Andaluz Quito', 'Fotos Hoteles/The Hotel Patio Andaluz Quito.png', 'png'),
  ('Relicario del Carmen Hotel', 'Fotos Hoteles/Relicario del Carmen Hotel.jpeg', 'jpeg'),
  ('Hotel Dann Carlton', 'Fotos Hoteles/Hotel Dann Carlton.png', 'png'),
  ('Hotel Sebastian', 'Fotos Hoteles/Hotel Sebastian.jpeg', 'jpeg'),
  ('Hotel Quito', 'Fotos Hoteles/Hotel Quito.jpeg', 'jpeg'),
  ('Hotel Vieja Cuba', 'Fotos Hoteles/Hotel Vieja Cuba.png', 'png'),
  ('Hotel Plaza Grande', 'Fotos Hoteles/Hotel Plaza Grande.png', 'png'),
  ('Hotel Finlandia', 'Fotos Hoteles/Hotel Finlandia.png', 'png'),
  ('Hacienda La Carriona', 'Fotos Hoteles/Hacienda La Carriona.jpeg', 'jpeg'),
  ('Hacienda Rumiloma', 'Fotos Hoteles/Hacienda Rumiloma.jpeg', 'jpeg'),
  ('Casa Aliso', 'Fotos Hoteles/Casa Aliso.png', 'png'),
  ('Mansion del Angel', 'Fotos Hoteles/Mansion del Angel.jpeg', 'jpeg'),
  ('Swissotel Quito', 'Fotos Hoteles/Swissotel Quito.jpeg', 'jpeg'),
  ('JW Marriot Hotel', 'Fotos Hoteles/JW Marriot Hotel.png', 'png'),
  ('Hotel Hilton Colon', 'Fotos Hoteles/Hotel Hilton Colon.jpeg', 'jpeg'),
  ('Ikala Quito Hotel Boutique', 'Fotos Hoteles/Ikala Quito Hotel Boutique.jpeg', 'jpeg'),
  ('Hotel Boutique La Casona de la Ronda', 'Fotos Hoteles/Hotel Boutique La Casona de la Ronda.jpeg', 'jpeg'),
  ('Casa Gangotena Hotel Boutique', 'Fotos Hoteles/Casa Gangotena Hotel Boutique.jpeg', 'jpeg'),
  ('Hacienda Su Merced', 'Fotos Hoteles/Hacienda Su Merced.jpeg', 'jpeg'),
  ('Hosteria Rincon de Puembo', 'Fotos Hoteles/Hosteria Rincon de Puembo.jpeg', 'jpeg'),
  ('Mashpi Lodge', 'Fotos Hoteles/Mashpi Lodge.png', 'png'),
  ('Illa Experience Hotel', 'Fotos Hoteles/Illa Experience Hotel.jpeg', 'jpeg'),
  ('San Jose de Puembo', 'Fotos Hoteles/San Jose de Puembo.png', 'png'),
  ('La Palma Hotel Polo Club', 'Fotos Hoteles/La Palma Hotel Polo Club.jpeg', 'jpeg'),
  ('Casa de Arte Puembo Bed & Breakfast Hotel', 'Fotos Hoteles/Casa de Arte Puembo Bed & Breakfast Hotel.png', 'png'),
  ('Puembo Birding Garden Bed and Breakfast', 'Fotos Hoteles/Puembo Birding Garden Bed and Breakfast.png', 'png'),
  ('Airport Garden Hosteria', 'Fotos Hoteles/Airport Garden Hosteria.png', 'png'),
  ('Casa dCampo Tababela Boutique Hotel', 'Fotos Hoteles/Casa dCampo Tababela Boutique Hotel.jpeg', 'jpeg'),
  ('Hotel Boutique Plaza Sucre', 'Fotos Hoteles/Hotel Boutique Plaza Sucre.png', 'png'),
  ('The Wyndham Quito Airport Hotel', 'Fotos Hoteles/The Wyndham Quito Airport Hotel.jpeg', 'jpeg'),
  ('Hacienda La Jimenita', 'Fotos Hoteles/Hacienda La Jimenita.png', 'png'),
  ('Holiday Inn Quito Airport', 'Fotos Hoteles/Holiday Inn Quito Airport.png', 'png'),
  ('Hotel Cultura Manor', 'Fotos Hoteles/Hotel Cultura Manor.png', 'png'),
  ('Quinta La Constanza', 'Fotos Hoteles/Quinta La Constanza.png', 'png'),
  ('Wyndham Garden Quito', 'Fotos Hoteles/Wyndham Garden Quito.png', 'png'),
  ('Go Quito Hotel', 'Fotos Hoteles/Go Quito Hotel.png', 'png'),
  ('Hacienda Pinsaqui', 'Fotos Hoteles/Hacienda Pinsaqui.jpeg', 'jpeg'),
  ('The Yellow Guest House', 'Fotos Hoteles/The Yellow Guest House.jpeg', 'jpeg'),
  ('Hosteria La Casa de Hacienda', 'Fotos Hoteles/Hosteria La Casa de Hacienda.png', 'png'),
  ('La Mirage Garden Hotel and Spa', 'Fotos Hoteles/La Mirage Garden Hotel and Spa.png', 'png'),
  ('Hacienda Zuleta', 'Fotos Hoteles/Hacienda Zuleta.jpeg', 'jpeg'),
  ('Hacienda Cusin', 'Fotos Hoteles/Hacienda Cusin.png', 'png'),
  ('Guachala', 'Fotos Hoteles/Guachala.png', 'png'),
  ('Hacienda Piman', 'Fotos Hoteles/Hacienda Piman.png', 'png'),
  ('Hacienda Las Palmeras Inn', 'Fotos Hoteles/Hacienda Las Palmeras Inn.jpeg', 'jpeg'),
  ('Volcano Land', 'Fotos Hoteles/Volcano Land.jpeg', 'jpeg'),
  ('Santa Ana', 'Fotos Hoteles/Santa Ana.png', 'png'),
  ('Los Mortinos', 'Fotos Hoteles/Los Mortinos.png', 'png'),
  ('Hato Verde', 'Fotos Hoteles/Hato Verde.png', 'png'),
  ('El Tambo', 'Fotos Hoteles/El Tambo.jpeg', 'jpeg'),
  ('La Cienega', 'Fotos Hoteles/La Cienega.png', 'png'),
  ('Hacienda San Agustin de Callo', 'Fotos Hoteles/Hacienda San Agustin de Callo.jpeg', 'jpeg'),
  ('Hotel Cuello de Luna', 'Fotos Hoteles/Hotel Cuello de Luna.jpeg', 'jpeg'),
  ('Shalala Lodge', 'Fotos Hoteles/Shalala Lodge.png', 'png'),
  ('Hosteria Rumipamba de las Rosas', 'Fotos Hoteles/Hosteria Rumipamba de las Rosas.png', 'png'),
  ('Chicabamba Lodge', 'Fotos Hoteles/Chicabamba Lodge.png', 'png'),
  ('Sierraloma', 'Fotos Hoteles/Sierraloma.jpeg', 'jpeg'),
  ('Hacienda Leito', 'Fotos Hoteles/Hacienda Leito.jpeg', 'jpeg'),
  ('Hosteria Isla de Banos', 'Fotos Hoteles/Hosteria Isla de Banos.jpeg', 'jpeg'),
  ('Luna Runtun', 'Fotos Hoteles/Luna Runtun.jpeg', 'jpeg'),
  ('Samari Spa Resort', 'Fotos Hoteles/Samari Spa Resort.jpeg', 'jpeg'),
  ('The Sangay Spa Hotel', 'Fotos Hoteles/The Sangay Spa Hotel.jpeg', 'jpeg'),
  ('Hacienda Manteles', 'Fotos Hoteles/Hacienda Manteles.png', 'png'),
  ('Hill Star Refuge', 'Fotos Hoteles/Hill Star Refuge.jpeg', 'jpeg'),
  ('Hacienda Abraspungo', 'Fotos Hoteles/Hacienda Abraspungo.png', 'png'),
  ('Hosteria El Troje', 'Fotos Hoteles/Hosteria El Troje.jpeg', 'jpeg'),
  ('Mansion Santa Isabella', 'Fotos Hoteles/Mansion Santa Isabella.jpeg', 'jpeg'),
  ('San Pedro Hotel', 'Fotos Hoteles/San Pedro Hotel.png', 'png'),
  ('Rincon Aleman', 'Fotos Hoteles/Rincon Aleman.png', 'png'),
  ('La Quinta', 'Fotos Hoteles/La Quinta.png', 'png'),
  ('Casa San Rafael', 'Fotos Hoteles/Casa San Rafael.png', 'png'),
  ('Posada del Angel Hostel', 'Fotos Hoteles/Posada del Angel Hostel.png', 'png'),
  ('Hotel Victoria', 'Fotos Hoteles/Hotel Victoria.jpeg', 'jpeg'),
  ('Mansion Alcazar', 'Fotos Hoteles/Mansion Alcazar.png', 'png'),
  ('Hotel Rios del Valle', 'Fotos Hoteles/Hotel Rios del Valle.png', 'png'),
  ('Carvallo Hotel', 'Fotos Hoteles/Carvallo Hotel.png', 'png'),
  ('Itza Internacional Hotel Boutique', 'Fotos Hoteles/Itza Internacional Hotel Boutique.png', 'png'),
  ('Posada Ingapirca', 'Fotos Hoteles/Posada Ingapirca.png', 'png'),
  ('Mandala Inn', 'Fotos Hoteles/Mandala Inn.png', 'png'),
  ('Mantaraya Lodge', 'Fotos Hoteles/Mantaraya Lodge.jpeg', 'jpeg'),
  ('Nantu Hosteria', 'Fotos Hoteles/Nantu Hosteria.jpeg', 'jpeg'),
  ('Hosteria del Parque', 'Fotos Hoteles/Hosteria del Parque.png', 'png'),
  ('La Roulotte', 'Fotos Hoteles/La Roulotte.jpeg', 'jpeg'),
  ('Sachatamia', 'Fotos Hoteles/Sachatamia.jpeg', 'jpeg'),
  ('Las Terrazas de Dana Lodge', 'Fotos Hoteles/Las Terrazas de Dana Lodge.png', 'png'),
  ('Kapari Lodge', 'Fotos Hoteles/Kapari Lodge.png', 'png'),
  ('Termas de Papallacta SPA', 'Fotos Hoteles/Termas de Papallacta SPA.png', 'png'),
  ('BellaVista', 'Fotos Hoteles/BellaVista.jpeg', 'jpeg'),
  ('Sisakuna Lodge', 'Fotos Hoteles/Sisakuna Lodge.png', 'png'),
  ('Saguamby Mindo', 'Fotos Hoteles/Saguamby Mindo.png', 'png'),
  ('Hotel del Parque Guayaquil', 'Fotos Hoteles/Hotel del Parque Guayaquil.png', 'png'),
  ('Continental Hotel', 'Fotos Hoteles/Continental Hotel.png', 'png'),
  ('Oro Hotel', 'Fotos Hoteles/Oro Hotel.jpeg', 'jpeg'),
  ('Hampton Inn', 'Fotos Hoteles/Hampton Inn.png', 'png'),
  ('Mansion del Rio', 'Fotos Hoteles/Mansion del Rio.jpeg', 'jpeg'),
  ('Hilton Colon Guayaquil', 'Fotos Hoteles/Hilton Colon Guayaquil.jpeg', 'jpeg'),
  ('Hostel Macaw', 'Fotos Hoteles/Hostel Macaw.jpeg', 'jpeg'),
  ('Wyndham Hotel Guayaquil', 'Fotos Hoteles/Wyndham Hotel Guayaquil.png', 'png'),
  ('Corona Real Hotel', 'Fotos Hoteles/Corona Real Hotel.png', 'png'),
  ('Wyndham Garden Guayaquil Hotel', 'Fotos Hoteles/Wyndham Garden Guayaquil Hotel.jpeg', 'jpeg'),
  ('Hotel Plaza Monte Carlo', 'Fotos Hoteles/Hotel Plaza Monte Carlo.jpeg', 'jpeg'),
  ('DC Suites Guayaquil', 'Fotos Hoteles/DC Suites Guayaquil.png', 'png'),
  ('Holiday Inn Guayaquil Airport Hotel', 'Fotos Hoteles/Holiday Inn Guayaquil Airport Hotel.png', 'png'),
  ('Casa Upano', 'Fotos Hoteles/Casa Upano.jpeg', 'jpeg'),
  ('Polylepis Lodge', 'Fotos Hoteles/Polylepis Lodge.png', 'png'),
  ('Grand Victoria Hotel', 'Fotos Hoteles/Grand Victoria Hotel.jpeg', 'jpeg'),
  ('Zamorano Hotel', 'Fotos Hoteles/Zamorano Hotel.jpeg', 'jpeg'),
  ('The Podocarpus Hotel', 'Fotos Hoteles/The Podocarpus Hotel.jpeg', 'jpeg'),
  ('Tapichalaca Lodge and Reserve', 'Fotos Hoteles/Tapichalaca Lodge and Reserve.jpeg', 'jpeg'),
  ('Casa Marita', 'Fotos Hoteles/Casa Marita.jpeg', 'jpeg'),
  ('Sol y Mar Hotel', 'Fotos Hoteles/Sol y Mar Hotel.png', 'png'),
  ('Pimampiro Hosteria', 'Fotos Hoteles/Pimampiro Hosteria.png', 'png'),
  ('Casa Opuntia', 'Fotos Hoteles/Casa Opuntia.jpeg', 'jpeg'),
  ('Angermeyer Waterfront Inn', 'Fotos Hoteles/Angermeyer Waterfront Inn.png', 'png'),
  ('The Safari Camp Galapagos', 'Fotos Hoteles/The Safari Camp Galapagos.png', 'png'),
  ('Arena Blanca', 'Fotos Hoteles/Arena Blanca.png', 'png'),
  ('Villa Laguna', 'Fotos Hoteles/Villa Laguna.png', 'png'),
  ('Iguana Crossing', 'Fotos Hoteles/Iguana Crossing.png', 'png'),
  ('Playa Mann Beach House', 'Fotos Hoteles/Playa Mann Beach House.png', 'png'),
  ('Hotel Acacia', 'Fotos Hoteles/Hotel Acacia.jpeg', 'jpeg'),
  ('Tortuga Bay Galapagos Garden Hotel', 'Fotos Hoteles/Tortuga Bay Galapagos Garden Hotel.png', 'png'),
  ('Tintoreras Hostel', 'Fotos Hoteles/Tintoreras Hostel.jpeg', 'jpeg'),
  ('The Finch Bay', 'Fotos Hoteles/The Finch Bay.jpeg', 'jpeg'),
  ('Casita de la Playa', 'Fotos Hoteles/Casita de la Playa.png', 'png'),
  ('Golden Bay Hotel & Spa', 'Fotos Hoteles/Golden Bay Hotel & Spa.png', 'png'),
  ('Hotel Volcano', 'Fotos Hoteles/Hotel Volcano.png', 'png'),
  ('Hotel La Zayapa', 'Fotos Hoteles/Hotel La Zayapa.png', 'png'),
  ('Seaside Hotel', 'Fotos Hoteles/Seaside Hotel.png', 'png'),
  ('Galapagos Suites', 'Fotos Hoteles/Galapagos Suites.png', 'png'),
  ('Hotel La Isla', 'Fotos Hoteles/Hotel La Isla.jpeg', 'jpeg'),
  ('Enchanted Galapagos Lodge', 'Fotos Hoteles/Enchanted Galapagos Lodge.jpeg', 'jpeg'),
  ('Ikala Hotel', 'Fotos Hoteles/Ikala Hotel.png', 'png'),
  ('Blu Galapagos Hotel', 'Fotos Hoteles/Blu Galapagos Hotel.jpeg', 'jpeg'),
  ('Galapagos Sunset', 'Fotos Hoteles/Galapagos Sunset.png', 'png'),
  ('Deja Vu', 'Fotos Hoteles/Deja Vu.jpeg', 'jpeg'),
  ('Hotel Mainao', 'Fotos Hoteles/Hotel Mainao.png', 'png'),
  ('Hotel Silberstein', 'Fotos Hoteles/Hotel Silberstein.png', 'png'),
  ('Villa Escalesia', 'Fotos Hoteles/Villa Escalesia.jpeg', 'jpeg'),
  ('Cormorant Beach House Hotel', 'Fotos Hoteles/Cormorant Beach House Hotel.png', 'png'),
  ('Pelican Bay Hotel', 'Fotos Hoteles/Pelican Bay Hotel.jpeg', 'jpeg'),
  ('Plaza Luna Suites Hotel', 'Fotos Hoteles/Plaza Luna Suites Hotel.png', 'png'),
  ('Palo Santo Hotel', 'Fotos Hoteles/Palo Santo Hotel.jpeg', 'jpeg'),
  ('Hotel Fiesta', 'Fotos Hoteles/Hotel Fiesta.png', 'png'),
  ('La Casa de Judy', 'Fotos Hoteles/La Casa de Judy.png', 'png'),
  ('Hotel Santa Fe', 'Fotos Hoteles/Hotel Santa Fe.png', 'png'),
  ('Hostal North Seymour', 'Fotos Hoteles/Hostal North Seymour.png', 'png')
;

with resuelto as (
  select
    f.nombre_md,
    f.storage_path,
    f.formato,
    coalesce(
      (
        select coalesce(d.proveedor_id, d.proveedor_id_sugerido)
        from staging_proveedor_descripciones d
        where norm_nombre(d.nombre_md) = norm_nombre(f.nombre_md)
        order by d.proveedor_id nulls last, d.similitud desc nulls last
        limit 1
      ),
      (
        select p.id
        from proveedores p
        where norm_nombre(p.nombre) = norm_nombre(f.nombre_md)
        limit 1
      )
    ) as proveedor_id
  from stg_fotos f
)
insert into proveedor_imagenes (proveedor_id, storage_path, titulo, formato, orden, es_principal)
select
  r.proveedor_id,
  r.storage_path,
  r.nombre_md,
  r.formato,
  0,
  true
from resuelto r
where r.proveedor_id is not null
  and not exists (
    select 1 from proveedor_imagenes pi
    where pi.storage_path = r.storage_path
  );

-- Reporte de fotos que siguen sin proveedor (revisar manualmente): a esta
-- altura casi siempre son casos donde nombre_md en staging quedo corrupto
-- (capturo la descripcion en vez del nombre) o el proveedor no existe todavia.
do $$
declare
  sin_match text;
begin
  select string_agg(f.nombre_md, ', ')
  into sin_match
  from stg_fotos f
  where not exists (
    select 1 from proveedor_imagenes pi where pi.storage_path = f.storage_path
  );

  if sin_match is not null then
    raise notice 'Fotos sin proveedor resuelto: %', sin_match;
  end if;
end $$;
