-- ============================================================================
-- FIX: 10 tablas quedaron sin RLS habilitado en las migraciones originales
-- (catálogos y tablas de soporte del esquema tarifario). Detectado por
-- el advisor de seguridad de Supabase justo después de aplicar las 3
-- migraciones base: sin RLS, anon/authenticated tienen lectura Y escritura
-- sin restricción vía la API REST.
--
-- Mismo patrón que el resto del esquema: RLS habilitado + lectura para
-- authenticated. La escritura sigue pasando por service_role.
-- ============================================================================

alter table ubicaciones             enable row level security;
alter table proveedor_descripciones enable row level security;
alter table proveedor_imagenes      enable row level security;
alter table proveedor_amenities     enable row level security;
alter table amenities               enable row level security;
alter table temporadas              enable row level security;
alter table ocupaciones             enable row level security;
alter table planes_alimentacion     enable row level security;
alter table categorias_alojamiento  enable row level security;
alter table escalas_pax             enable row level security;

create policy "lectura autenticada" on ubicaciones
  for select to authenticated using (true);
create policy "lectura autenticada" on proveedor_descripciones
  for select to authenticated using (true);
create policy "lectura autenticada" on proveedor_imagenes
  for select to authenticated using (true);
create policy "lectura autenticada" on proveedor_amenities
  for select to authenticated using (true);
create policy "lectura autenticada" on amenities
  for select to authenticated using (true);
create policy "lectura autenticada" on temporadas
  for select to authenticated using (true);
create policy "lectura autenticada" on ocupaciones
  for select to authenticated using (true);
create policy "lectura autenticada" on planes_alimentacion
  for select to authenticated using (true);
create policy "lectura autenticada" on categorias_alojamiento
  for select to authenticated using (true);
create policy "lectura autenticada" on escalas_pax
  for select to authenticated using (true);
