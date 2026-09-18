-- Nexo Clínico · Esquema PostgreSQL para Neon
--
-- Ejecutar sobre una base (o rama de Neon) vacía, en este orden:
--   psql "$DATABASE_URL" -f db/schema.sql
--   psql "$DATABASE_URL" -f db/seed.sql      -- solo en ramas de desarrollo
--
-- Compatible con Postgres 15+ (Neon crea proyectos en 16/17).
-- Los valores de los enums coinciden con lib/types.ts para mapear sin traducir.

begin;

create extension if not exists citext;

-- ─── Tipos ──────────────────────────────────────────────────────────────────

create type role_code         as enum ('MÉDICO', 'ADMIN', 'DIGITALIZADOR');
create type membership_status as enum ('Pendiente', 'Habilitado', 'Suspendido');
create type cmp_status        as enum ('verificado', 'revision_manual', 'no_verificado');
create type auth_method       as enum ('WebAuthn', 'EmailOTP', 'Sistema');
create type document_status   as enum ('recibido', 'analizando', 'enviado');
create type version_origin    as enum ('IA', 'MÉDICO');
create type version_status    as enum ('pendiente', 'aprobada');
create type access_reason     as enum ('Emergencia médica', 'Atención no programada', 'Otro');
create type access_status     as enum ('pendiente', 'vigente', 'vencido', 'denegado');
create type audit_result      as enum ('ALLOW', 'DENY', 'REVIEW');
create type alert_severity    as enum ('alta', 'media', 'baja');
create type alert_status      as enum ('abierta', 'en revisión', 'cerrada');

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── Instituciones, personas y roles ────────────────────────────────────────

create table institutions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  kind         text not null,                 -- Hospital público, Clínica privada…
  city         text not null,
  email_domain citext,                        -- valida el correo institucional en /registro
  created_at   timestamptz not null default now()
);

create table users (
  id                   uuid primary key default gen_random_uuid(),
  dni                  char(8) unique check (dni ~ '^[0-9]{8}$'),
  full_name            text not null,
  short_name           text not null,         -- las iniciales se derivan en la app
  email                citext not null unique,
  email_verified_at    timestamptz,
  identity_verified_at timestamptz,           -- consulta RENIEC
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Solo para personas colegiadas (médicos y auditores con CMP).
create table professional_profiles (
  user_id          uuid primary key references users (id) on delete cascade,
  cmp              varchar(6) not null unique check (cmp ~ '^[0-9]{1,6}$'),
  cmp_status       cmp_status not null default 'no_verificado',
  cmp_verified_at  timestamptz,
  specialty        text,
  rne              varchar(6),
  regional_council text,
  check (cmp_status <> 'verificado' or cmp_verified_at is not null)
);

create table roles (
  code        role_code primary key,
  label       text not null,
  description text not null
);

-- Los códigos coinciden con las claves de RoleDefinition.permissions.
create table permissions (
  code  text primary key,
  label text not null
);

create table role_permissions (
  role       role_code not null references roles (code) on delete cascade,
  permission text not null references permissions (code) on delete cascade,
  primary key (role, permission)
);

-- Vínculo persona ↔ institución con su rol. Reemplaza al tipo Professional del mock:
-- una sola fila de users por persona, y el estado de alta vive en el vínculo.
create table memberships (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users (id) on delete cascade,
  institution_id uuid not null references institutions (id),
  role           role_code not null references roles (code),
  status         membership_status not null default 'Pendiente',
  approved_by    uuid references users (id),
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, institution_id),
  check (status <> 'Habilitado' or approved_at is not null),
  check (approved_by is null or approved_by <> user_id)
);

create index memberships_institution_idx on memberships (institution_id, status);

-- ─── Autenticación ──────────────────────────────────────────────────────────

create table passkeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  credential_id bytea not null unique,
  public_key    bytea not null,
  sign_count    bigint not null default 0,
  transports    text[] not null default '{}',
  aaguid        uuid,
  device_label  text not null,                -- "Windows PC · Surface"
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index passkeys_user_idx on passkeys (user_id);

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  token_hash    bytea not null unique,        -- sha256 del token de la cookie, nunca el token
  user_id       uuid not null references users (id) on delete cascade,
  membership_id uuid not null references memberships (id),
  auth_method   auth_method not null,
  passkey_id    uuid references passkeys (id) on delete set null,
  ip            inet,
  user_agent    text,
  risk_score    smallint not null default 0 check (risk_score between 0 and 100),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  step_up_at    timestamptz,                  -- última reautenticación para acciones sensibles
  expires_at    timestamptz not null,
  revoked_at    timestamptz                   -- "Cerrar otras sesiones"
);

create index sessions_active_idx on sessions (user_id) where revoked_at is null;

create table email_otps (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,
  purpose     text not null check (purpose in ('login', 'registro')),
  code_hash   text not null,                  -- nunca el código en claro
  attempts    smallint not null default 0 check (attempts between 0 and 5),
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index email_otps_email_idx on email_otps (email, created_at desc);

-- Desafíos WebAuthn de un solo uso (también en db/migrations/002_webauthn_challenges.sql).
create table webauthn_challenges (
  id          uuid primary key default gen_random_uuid(),
  purpose     text not null check (purpose in ('registro', 'login')),
  challenge   text not null,                       -- base64url, generado por el servidor
  user_id     uuid references users (id) on delete cascade,   -- null en login sin usuario identificado
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now(),
  check (purpose <> 'registro' or user_id is not null)
);

create index webauthn_challenges_expires_idx on webauthn_challenges (expires_at);

-- ─── Pacientes e historias clínicas ─────────────────────────────────────────

create table patients (
  id         uuid primary key default gen_random_uuid(),
  dni        char(8) unique check (dni ~ '^[0-9]{8}$'),
  full_name  text not null,
  birth_date date,
  created_at timestamptz not null default now()
);

create table clinical_records (
  id             uuid primary key default gen_random_uuid(),
  record_number  text not null unique,        -- HC-2026-00182
  patient_id     uuid not null references patients (id),
  institution_id uuid not null references institutions (id),
  created_at     timestamptz not null default now(),
  unique (patient_id, institution_id)
);

-- Relación asistencial: base del control ABAC ("Relationship: NONE" en /revision).
create table care_relationships (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references users (id),
  patient_id      uuid not null references patients (id),
  institution_id  uuid not null references institutions (id),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  check (ended_at is null or ended_at > started_at)
);

create index care_relationships_active_idx
  on care_relationships (professional_id, patient_id)
  where ended_at is null;

-- ─── Migración masiva de actas físicas ──────────────────────────────────────

create type migration_item_status as enum
  ('pendiente', 'analizado', 'vinculado', 'creado', 'descartado');

create table migration_batches (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions (id),
  created_by     uuid not null references users (id),
  created_at     timestamptz not null default now()
);

-- Zona de espera entre la subida de un acta y la confirmación de a qué paciente/historia
-- pertenece: documents.clinical_record_id es not null, así que no puede haber un documento
-- real hasta que un digitalizador confirme el match (o el alta de un paciente nuevo).
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

-- ─── Documentos y transcripciones ───────────────────────────────────────────

-- El archivo escaneado vive en object storage (R2, S3, Vercel Blob…); aquí solo su referencia.
-- status reemplaza a QueueItem: /pendientes lista recibido/analizando, /historial lista enviado.
create table documents (
  id                 uuid primary key default gen_random_uuid(),
  clinical_record_id uuid not null references clinical_records (id),
  kind               text not null,           -- Receta, Nota de evolución…
  title              text not null,
  storage_key        text not null unique,
  mime_type          text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/svg+xml')),
  size_bytes         integer not null check (size_bytes > 0),
  sha256             bytea not null check (length(sha256) = 32),   -- "Hash original"
  bytes              bytea,                  -- contenido del archivo, para el análisis de imagen
  status             document_status not null default 'recibido',
  uploaded_by        uuid not null references users (id),
  received_at        timestamptz not null default now(),
  sent_to_review_at  timestamptz,
  updated_at         timestamptz not null default now(),
  check ((status = 'enviado') = (sent_to_review_at is not null))
);

create index documents_status_idx on documents (status, received_at desc);
create index documents_record_idx on documents (clinical_record_id);

-- Cada corrección inserta una versión nueva; una versión aprobada no se modifica jamás.
-- La versión vigente de un documento es la aprobada con mayor número.
create table transcription_versions (
  id                    uuid primary key default gen_random_uuid(),
  document_id           uuid not null references documents (id),
  version               integer not null check (version > 0),
  origin                version_origin not null,
  status                version_status not null default 'pendiente',
  confidence            smallint check (confidence between 0 and 100),
  low_confidence_fields text[] not null default '{}'
    check (low_confidence_fields <@ array['medication', 'dose', 'frequency', 'duration']),
  note_text             text,                 -- notas de evolución; las recetas usan prescription_items
  content_sha256        bytea check (length(content_sha256) = 32),   -- "Hash transcripción"
  created_by            uuid references users (id),                  -- null = motor IA
  created_at            timestamptz not null default now(),
  approved_by           uuid references users (id),
  approved_at           timestamptz,
  approval_session_id   uuid references sessions (id),
  unique (document_id, version),
  check ((origin = 'IA') = (created_by is null)),
  check ((status = 'aprobada') = (approved_by is not null and approved_at is not null)),
  check (status <> 'aprobada' or content_sha256 is not null)
);

create index transcription_versions_approved_idx
  on transcription_versions (document_id, version desc)
  where status = 'aprobada';

create table prescription_items (
  version_id uuid not null references transcription_versions (id) on delete cascade,
  position   smallint not null check (position > 0),
  medication text not null,
  dose       text not null,
  frequency  text not null,
  duration   text not null,
  primary key (version_id, position)
);

create function forbid_approved_version_change() returns trigger
language plpgsql as $$
begin
  if old.status = 'aprobada' then
    raise exception 'La versión % está aprobada y es inmutable; crea una nueva versión.', old.version;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger transcription_versions_immutable
  before update or delete on transcription_versions
  for each row execute function forbid_approved_version_change();

create function forbid_approved_item_change() returns trigger
language plpgsql as $$
begin
  if tg_op in ('UPDATE', 'DELETE')
     and exists (select 1 from transcription_versions where id = old.version_id and status = 'aprobada') then
    raise exception 'Los medicamentos de una versión aprobada son inmutables.';
  end if;
  if tg_op in ('INSERT', 'UPDATE')
     and exists (select 1 from transcription_versions where id = new.version_id and status = 'aprobada') then
    raise exception 'No se pueden agregar medicamentos a una versión aprobada.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger prescription_items_immutable
  before insert or update or delete on prescription_items
  for each row execute function forbid_approved_item_change();

-- ─── Accesos excepcionales (break-glass) ────────────────────────────────────

-- decided_by null con decided_at presente = concedido automáticamente tras Passkey.
create table access_requests (
  id                 uuid primary key default gen_random_uuid(),
  requester_id       uuid not null references users (id),
  clinical_record_id uuid not null references clinical_records (id),
  reason             access_reason not null,
  justification      text not null check (length(btrim(justification)) >= 10),
  requested_window   interval not null default interval '2 hours'
    check (requested_window > interval '0' and requested_window <= interval '24 hours'),
  status             access_status not null default 'pendiente',
  requested_at       timestamptz not null default now(),
  decided_by         uuid references users (id),
  decided_at         timestamptz,
  expires_at         timestamptz,
  updated_at         timestamptz not null default now(),
  check (status = 'pendiente' or decided_at is not null),
  check (status <> 'vigente' or expires_at is not null),
  check (decided_by is null or decided_by <> requester_id)
);

create index access_requests_status_idx on access_requests (status, requested_at desc);
create index access_requests_active_idx
  on access_requests (requester_id, clinical_record_id)
  where status = 'vigente';

-- ¿Puede este profesional abrir esta historia? Relación asistencial vigente o break-glass no vencido.
create function can_access_record(p_user uuid, p_record uuid) returns boolean
language sql stable as $$
  select exists (
    select 1
    from clinical_records cr
    join care_relationships rel
      on rel.patient_id = cr.patient_id
     and rel.institution_id = cr.institution_id
    where cr.id = p_record
      and rel.professional_id = p_user
      and rel.started_at <= now()
      and (rel.ended_at is null or rel.ended_at > now())
  ) or exists (
    select 1
    from access_requests ar
    where ar.clinical_record_id = p_record
      and ar.requester_id = p_user
      and ar.status = 'vigente'
      and ar.expires_at > now()
  )
$$;

-- ─── Auditoría ──────────────────────────────────────────────────────────────

-- Solo inserción. El trigger evita errores de la app; la garantía real es que el rol
-- de conexión de la app no sea dueño de la tabla (ver notas al final).
create table audit_events (
  id            bigint generated always as identity primary key,
  occurred_at   timestamptz not null default now(),
  actor_id      uuid references users (id),   -- null = Sistema
  actor_cmp     varchar(6),                   -- copia al momento del evento
  session_id    uuid references sessions (id),
  action        text not null check (action ~ '^[A-Z][A-Z_]*$'),
  resource_type text not null,                -- clinical_record, session, document…
  resource_ref  text not null,                -- HC-00182, Sesión 82A
  result        audit_result not null,
  risk_score    smallint not null default 0 check (risk_score between 0 and 100),
  auth_method   auth_method not null,
  ip            inet,
  metadata      jsonb not null default '{}'
);

create index audit_events_time_idx   on audit_events (occurred_at desc);
create index audit_events_actor_idx  on audit_events (actor_id, occurred_at desc);
create index audit_events_action_idx on audit_events (action, occurred_at desc);

create function forbid_audit_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_events es de solo inserción (% no permitido).', tg_op;
end $$;

create trigger audit_events_append_only
  before update or delete on audit_events
  for each row execute function forbid_audit_mutation();

create trigger audit_events_no_truncate
  before truncate on audit_events
  for each statement execute function forbid_audit_mutation();

-- ─── Alertas y estado del sistema ───────────────────────────────────────────

create table alerts (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  detail            text not null,
  severity          alert_severity not null,
  status            alert_status not null default 'abierta',
  assignee_id       uuid references users (id),
  audit_event_id    bigint references audit_events (id),
  access_request_id uuid references access_requests (id),
  created_at        timestamptz not null default now(),
  closed_at         timestamptz,
  updated_at        timestamptz not null default now(),
  check ((status = 'cerrada') = (closed_at is not null))
);

create index alerts_open_idx on alerts (severity, created_at desc) where status <> 'cerrada';

create table service_status (
  service     text primary key,
  label       text not null,
  operational boolean not null default true,
  updated_by  uuid references users (id),
  updated_at  timestamptz not null default now()
);

-- Umbral configurable de la alerta "ritmo de revisión inusual" en /revision.
-- Fila única (patrón singleton con id boolean).
create table risk_thresholds (
  id             boolean primary key default true check (id),
  max_decisions  integer not null default 2 check (max_decisions >= 1),
  window_seconds integer not null default 3 check (window_seconds >= 1),
  updated_by     uuid references users (id),
  updated_at     timestamptz not null default now()
);

-- ─── updated_at automático ──────────────────────────────────────────────────

create trigger users_updated_at           before update on users           for each row execute function set_updated_at();
create trigger memberships_updated_at     before update on memberships     for each row execute function set_updated_at();
create trigger documents_updated_at       before update on documents       for each row execute function set_updated_at();
create trigger access_requests_updated_at before update on access_requests for each row execute function set_updated_at();
create trigger alerts_updated_at          before update on alerts          for each row execute function set_updated_at();
create trigger service_status_updated_at  before update on service_status  for each row execute function set_updated_at();
create trigger risk_thresholds_updated_at before update on risk_thresholds for each row execute function set_updated_at();

-- ─── Vistas con la misma forma que los tipos de lib/types.ts ────────────────

-- Professional
create view professionals_view as
select m.id,
       m.user_id,
       u.short_name              as name,
       coalesce(pp.cmp, '—')     as cmp,
       pp.cmp_status,
       i.name                    as institution,
       m.role,
       m.status
from memberships m
join users u        on u.id = m.user_id
join institutions i on i.id = m.institution_id
left join professional_profiles pp on pp.user_id = m.user_id;

-- AuditEvent
create view audit_events_view as
select e.id,
       e.occurred_at,
       coalesce(u.short_name, 'Sistema') as "user",
       e.action,
       e.resource_ref                    as resource,
       e.result,
       e.actor_cmp                       as cmp,
       e.risk_score,
       e.auth_method                     as auth,
       e.ip
from audit_events e
left join users u on u.id = e.actor_id;

-- AccessRequest. Un acceso vigente cuya ventana ya pasó se muestra como vencido.
create view access_requests_view as
select ar.id,
       u.short_name     as requester,
       p.full_name      as patient,
       cr.record_number as record_id,
       ar.reason,
       ar.justification,
       case
         when ar.status = 'vigente' and ar.expires_at <= now() then 'vencido'::access_status
         else ar.status
       end              as status,
       ar.requested_at,
       ar.requested_window,
       ar.expires_at
from access_requests ar
join users u            on u.id = ar.requester_id
join clinical_records cr on cr.id = ar.clinical_record_id
join patients p         on p.id = cr.patient_id;

-- Cola de /revision: documentos enviados cuya última versión sigue pendiente.
create view review_queue_view as
select d.id            as document_id,
       cr.id           as clinical_record_id,
       cr.record_number,
       p.full_name     as patient,
       tv.id           as version_id,
       tv.version,
       tv.confidence,
       tv.low_confidence_fields,
       d.sent_to_review_at
from documents d
join clinical_records cr on cr.id = d.clinical_record_id
join patients p          on p.id = cr.patient_id
join lateral (
  select *
  from transcription_versions v
  where v.document_id = d.id
  order by v.version desc
  limit 1
) tv on tv.status = 'pendiente'
where d.status = 'enviado';

-- ─── Datos de referencia (necesarios en producción) ─────────────────────────

insert into roles (code, label, description) values
  ('MÉDICO',        'Médico',        'Revisa y valida transcripciones clínicas de sus pacientes.'),
  ('ADMIN',         'Administrador', 'Gestiona profesionales y configuración; supervisa trazabilidad, alertas y accesos excepcionales.'),
  ('DIGITALIZADOR', 'Digitalizador', 'Carga y prepara documentos. No puede aprobar.');

insert into permissions (code, label) values
  ('reviewClinical',  'Revisar clínica'),
  ('approveClinical', 'Aprobar clínica'),
  ('digitize',        'Digitalizar'),
  ('viewAudit',       'Ver auditoría'),
  ('manageUsers',     'Gestionar usuarios');

insert into role_permissions (role, permission) values
  ('MÉDICO',        'reviewClinical'),
  ('MÉDICO',        'approveClinical'),
  ('ADMIN',         'manageUsers'),
  ('ADMIN',         'viewAudit'),
  ('DIGITALIZADOR', 'digitize');

insert into service_status (service, label) values
  ('identity',       'Identidad'),
  ('application',    'Aplicación'),
  ('transcription',  'Transcripción IA'),
  ('audit',          'Auditoría'),
  ('risk_engine',    'Motor de riesgo');

insert into risk_thresholds (id) values (true);

commit;

-- ─── Notas para Neon ────────────────────────────────────────────────────────
-- · Crea un rol de aplicación distinto del dueño (Neon Console → Roles) y úsalo en DATABASE_URL:
--     grant usage on schema public to app;
--     grant select, insert, update, delete on all tables in schema public to app;
--     grant usage on all sequences in schema public to app;
--     revoke update, delete, truncate on audit_events from app;
--   Así el trigger de solo inserción no se puede desactivar desde la app.
-- · Usa la cadena "pooled" (-pooler) desde Next.js y la directa para migraciones.
-- · Prueba migraciones en una rama de Neon antes de aplicarlas a main.
