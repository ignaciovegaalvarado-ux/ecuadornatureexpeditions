-- ============================================================================
-- STAGING: descripciones de proveedores (documento "Hoteles Foto")
--
-- Mismo criterio que staging_tarifas_origen: el documento entra sin
-- interpretar (nombre tal cual aparece en el .md + descripción completa),
-- se calcula un candidato de match contra proveedores por similitud de
-- trigramas, y sólo se promueve a proveedor_descripciones tras revisión
-- (automática si la similitud es alta, manual si es baja).
--
-- Las imágenes del documento NO están disponibles en esta etapa: el .md
-- subido trae 149 marcadores "data:image/jpeg;base64..." sin los bytes
-- reales (el archivo pesa 81KB para 149 fotos, imposible si fueran datos
-- reales). proveedor_imagenes se poblará cuando se disponga del .docx
-- original con las imágenes íntegras.
-- ============================================================================

create table staging_proveedor_descripciones (
  id                  uuid primary key default gen_random_uuid(),
  nombre_md           text not null,        -- nombre tal cual aparece en Hoteles Foto (inglés)
  idioma              char(2) not null default 'en',
  descripcion         text not null,
  region_md           text,                 -- encabezado de sección: "HOTELES QUITO", etc.
  proveedor_id_sugerido uuid references proveedores(id) on delete set null,
  similitud           numeric(4,3),
  estado              estado_revision not null default 'PENDIENTE',
  proveedor_id        uuid references proveedores(id) on delete set null,
  fuente              text not null default 'HotelesFoto.md',
  importado_en        timestamptz not null default now()
);
create index on staging_proveedor_descripciones (estado);
create index on staging_proveedor_descripciones (proveedor_id_sugerido);

alter table staging_proveedor_descripciones enable row level security;
create policy "lectura autenticada" on staging_proveedor_descripciones
  for select to authenticated using (true);
