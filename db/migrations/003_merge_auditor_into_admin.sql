-- Nexo Clínico · Migración 003: el rol AUDITOR desaparece; ADMIN hereda sus permisos
--   psql "$DATABASE_URL" -f db/migrations/003_merge_auditor_into_admin.sql
--
-- Cualquier membresía en AUDITOR pasa a ADMIN, que ahora también tiene el permiso
-- viewAudit. Como Postgres no permite quitar un valor de un enum, se recrea role_code
-- sin 'AUDITOR'.

begin;

update memberships set role = 'ADMIN', updated_at = now() where role = 'AUDITOR';

insert into role_permissions (role, permission)
values ('ADMIN', 'viewAudit')
on conflict do nothing;

delete from role_permissions where role = 'AUDITOR';
delete from roles where code = 'AUDITOR';

drop view professionals_view;

alter table memberships drop constraint memberships_role_fkey;
alter table role_permissions drop constraint role_permissions_role_fkey;
alter table roles drop constraint roles_pkey;

create type role_code_new as enum ('MÉDICO', 'ADMIN', 'DIGITALIZADOR');

alter table roles alter column code type role_code_new using code::text::role_code_new;
alter table memberships alter column role type role_code_new using role::text::role_code_new;
alter table role_permissions alter column role type role_code_new using role::text::role_code_new;

drop type role_code;
alter type role_code_new rename to role_code;

alter table roles add primary key (code);
alter table memberships add constraint memberships_role_fkey foreign key (role) references roles (code);
alter table role_permissions
  add constraint role_permissions_role_fkey foreign key (role) references roles (code) on delete cascade;

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

commit;
