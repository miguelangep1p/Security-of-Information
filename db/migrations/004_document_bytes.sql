-- Nexo Clínico · Migración 004: conserva el contenido del documento para el análisis de imagen
--   psql "$DATABASE_URL" -f db/migrations/004_document_bytes.sql
--
-- Hasta ahora solo se guardaba el hash SHA-256 del archivo subido, no el archivo en sí,
-- así que no había nada que enviarle a un motor de IA. Sin object storage configurado,
-- se guarda el contenido (≤4 MB, ya validado en la subida) directo en la fila.

begin;

alter table documents add column bytes bytea;

commit;
