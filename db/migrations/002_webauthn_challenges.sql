-- Nexo Clínico · Migración 002: desafíos WebAuthn para passkeys reales
--   psql "$DATABASE_URL" -f db/migrations/002_webauthn_challenges.sql
--
-- Cada intento de registro o inicio de sesión con passkey genera un desafío de un solo uso.
-- El navegador solo recibe el id en una cookie httpOnly; el desafío se valida y consume en el servidor.

begin;

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

commit;
