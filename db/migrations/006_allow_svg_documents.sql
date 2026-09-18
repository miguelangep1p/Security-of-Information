-- Permite guardar imágenes SVG generadas (recetas de demo) además de PDF/JPEG/PNG.
alter table documents drop constraint documents_mime_type_check;
alter table documents add constraint documents_mime_type_check
  check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/svg+xml'));
