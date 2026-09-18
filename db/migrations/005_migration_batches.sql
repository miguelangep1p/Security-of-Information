-- Nexo Clínico · Migración 005: lotes de migración masiva de actas físicas
--   psql "$DATABASE_URL" -f db/migrations/005_migration_batches.sql
--
-- documents.clinical_record_id es not null, así que un acta subida en un lote de
-- migración no puede volverse un documento real hasta que un digitalizador confirme
-- a qué paciente/historia pertenece. Estas dos tablas son la zona de espera entre la
-- subida y esa confirmación; migration.ts las usa para proponer un match (o un
-- paciente nuevo) por cada archivo antes de escribir en documents.

begin;

create type migration_item_status as enum
  ('pendiente', 'analizado', 'vinculado', 'creado', 'descartado');

create table migration_batches (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions (id),
  created_by     uuid not null references users (id),
  created_at     timestamptz not null default now()
);

create table migration_items (
  id                          uuid primary key default gen_random_uuid(),
  batch_id                    uuid not null references migration_batches (id) on delete cascade,
  filename                    text not null,
  mime_type                   text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes                  integer not null check (size_bytes > 0),
  sha256                      bytea not null check (length(sha256) = 32),
  bytes                       bytea,                 -- se libera (null) al confirmar, una vez copiado a documents
  status                      migration_item_status not null default 'pendiente',
  ocr_patient_name            text,
  ocr_patient_dni             text,                  -- propuesta del OCR; no pasa por el check estricto de patients.dni
  ocr_document_kind           text,
  ocr_confidence               smallint check (ocr_confidence between 0 and 100),
  ocr_result                  jsonb not null default '{}',  -- payload completo devuelto por extractMigrationFields
  suggested_patient_id        uuid references patients (id),  -- match automático por DNI, propuesto, no confirmado
  matched_patient_id          uuid references patients (id),
  matched_clinical_record_id  uuid references clinical_records (id),
  resulting_document_id       uuid references documents (id),
  reviewed_by                 uuid references users (id),
  reviewed_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  check (status not in ('vinculado', 'creado') or
         (matched_patient_id is not null and matched_clinical_record_id is not null
          and resulting_document_id is not null and reviewed_by is not null and reviewed_at is not null)),
  check (status <> 'descartado' or (reviewed_by is not null and reviewed_at is not null))
);

create index migration_items_batch_idx on migration_items (batch_id, status);

commit;
