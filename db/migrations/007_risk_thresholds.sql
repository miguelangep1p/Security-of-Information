-- Umbral configurable de la alerta "ritmo de revisión inusual" (antes fijo en el cliente:
-- 2 decisiones en 3 segundos). Fila única (patrón singleton con id boolean).
create table risk_thresholds (
  id             boolean primary key default true check (id),
  max_decisions  integer not null default 2 check (max_decisions >= 1),
  window_seconds integer not null default 3 check (window_seconds >= 1),
  updated_by     uuid references users (id),
  updated_at     timestamptz not null default now()
);

insert into risk_thresholds (id) values (true);

create trigger risk_thresholds_updated_at before update on risk_thresholds
  for each row execute function set_updated_at();
