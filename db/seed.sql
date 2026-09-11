-- Nexo Clínico · Datos de demostración (equivalen a lib/mock/*)
-- Solo para ramas de desarrollo. Requiere haber ejecutado db/schema.sql.
-- Las fechas relativas del mock ("Hoy", "Ayer") se fijan al 4 de septiembre de 2026, hora de Lima.

begin;

insert into institutions (name, kind, city, email_domain) values
  ('Hospital Regional Demo', 'Hospital público',   'Trujillo',     'hospitaldemo.pe'),
  ('Clínica Demo Norte',     'Clínica privada',    'Víctor Larco', 'clinicademo.pe'),
  ('Centro Médico Demo',     'Centro ambulatorio', 'La Esperanza', 'centromedicodemo.pe');

insert into users (full_name, short_name, email, email_verified_at, identity_verified_at) values
  ('Carlos Mendoza Salazar', 'Carlos Mendoza', 'c.mendoza@hospitaldemo.pe', '2026-08-01 09:00-05', '2026-08-01 09:00-05'),
  ('Rosa Huamán Vega',       'Rosa Huamán',    'r.huaman@hospitaldemo.pe',  '2026-07-15 09:00-05', '2026-07-15 09:00-05'),
  ('Luis Paredes Ortiz',     'Luis Paredes',   'l.paredes@hospitaldemo.pe', '2026-08-01 09:00-05', '2026-08-01 09:00-05'),
  ('Elena Quispe Ramos',     'Elena Quispe',   'e.quispe@hospitaldemo.pe',  '2026-08-01 09:00-05', '2026-08-01 09:00-05'),
  ('Ana Valdivia Cruz',      'Ana Valdivia',   'a.valdivia@clinicademo.pe', '2026-08-01 09:00-05', '2026-08-01 09:00-05'),
  ('Diego Robles Tapia',     'Diego Robles',   'd.robles@centromedicodemo.pe', '2026-08-01 09:00-05', '2026-08-01 09:00-05');

insert into professional_profiles (user_id, cmp, cmp_status, cmp_verified_at, specialty, rne, regional_council)
select u.id, p.cmp, 'verificado', '2026-08-01 09:05-05', p.specialty, p.rne, p.council
from (values
  ('c.mendoza@hospitaldemo.pe',    '084521', 'Medicina Interna', '045821', 'La Libertad'),
  ('a.valdivia@clinicademo.pe',    '071402', 'Emergencia',       '038112', 'La Libertad'),
  ('l.paredes@hospitaldemo.pe',    '059310', null,               null,     null),
  ('d.robles@centromedicodemo.pe', '062913', null,               null,     null)
) as p(email, cmp, specialty, rne, council)
join users u on u.email = p.email;

insert into memberships (user_id, institution_id, role, status, approved_by, approved_at)
select u.id, i.id, m.role::role_code, 'Habilitado', admin.id, timestamptz '2026-08-01 10:00-05'
from (values
  ('c.mendoza@hospitaldemo.pe',    'Hospital Regional Demo', 'MÉDICO'),
  ('a.valdivia@clinicademo.pe',    'Clínica Demo Norte',     'MÉDICO'),
  ('d.robles@centromedicodemo.pe', 'Centro Médico Demo',     'MÉDICO'),
  ('r.huaman@hospitaldemo.pe',     'Hospital Regional Demo', 'ADMIN'),
  ('l.paredes@hospitaldemo.pe',    'Hospital Regional Demo', 'AUDITOR'),
  ('e.quispe@hospitaldemo.pe',     'Hospital Regional Demo', 'DIGITALIZADOR')
) as m(email, institution, role)
join users u        on u.email = m.email
join institutions i on i.name = m.institution
left join users admin on admin.email = 'r.huaman@hospitaldemo.pe' and admin.email <> m.email;

-- ─── Pacientes, historias y relaciones asistenciales ────────────────────────

insert into patients (full_name) values
  ('Lucía Torres Vega'),
  ('Mateo Ríos Luna'),
  ('Elena Campos Ruiz'),
  ('Tomás Silva Paz'),
  ('Rosa Delgado Núñez'),
  ('Hugo Salas Díaz'),
  ('Marta León Paz');

insert into clinical_records (record_number, patient_id, institution_id)
select r.record_number, p.id, i.id
from (values
  ('HC-2026-00182', 'Lucía Torres Vega',  'Hospital Regional Demo'),
  ('HC-2026-00183', 'Mateo Ríos Luna',    'Hospital Regional Demo'),
  ('HC-2026-00184', 'Elena Campos Ruiz',  'Hospital Regional Demo'),
  ('HC-2026-00185', 'Tomás Silva Paz',    'Hospital Regional Demo'),
  ('HC-2026-00186', 'Rosa Delgado Núñez', 'Hospital Regional Demo'),
  ('HC-00209',      'Hugo Salas Díaz',    'Clínica Demo Norte'),
  ('HC-00190',      'Marta León Paz',     'Centro Médico Demo')
) as r(record_number, patient, institution)
join patients p     on p.full_name = r.patient
join institutions i on i.name = r.institution;

-- Carlos no tiene relación con Tomás Silva Paz: HC-2026-00185 es el documento restringido.
insert into care_relationships (professional_id, patient_id, institution_id, started_at)
select u.id, cr.patient_id, cr.institution_id, '2026-08-15 08:00-05'
from users u
join clinical_records cr on cr.record_number in ('HC-2026-00182', 'HC-2026-00183', 'HC-2026-00184')
where u.email = 'c.mendoza@hospitaldemo.pe';

-- ─── Documentos (cola de digitalización) ────────────────────────────────────

insert into documents (clinical_record_id, kind, title, storage_key, mime_type, size_bytes, sha256,
                       status, uploaded_by, received_at, sent_to_review_at)
select cr.id, d.kind, d.title, d.storage_key, 'application/pdf', d.size_bytes,
       sha256(convert_to(d.storage_key, 'UTF8')),
       d.status::document_status, u.id, d.received_at, d.sent_at
from (values
  ('HC-2026-00182', 'Receta',            'Receta HC-2026-00182', 'demo/HC-2026-00182/receta.pdf', 184213, 'enviado',    timestamptz '2026-09-04 09:10-05', timestamptz '2026-09-04 09:22-05'),
  ('HC-2026-00183', 'Receta',            'Receta HC-2026-00183', 'demo/HC-2026-00183/receta.pdf', 176040, 'analizando', timestamptz '2026-09-04 09:41-05', null),
  ('HC-2026-00184', 'Receta',            'Receta HC-2026-00184', 'demo/HC-2026-00184/receta.pdf', 190552, 'enviado',    timestamptz '2026-09-04 08:30-05', timestamptz '2026-09-04 08:44-05'),
  ('HC-2026-00185', 'Receta',            'Receta HC-2026-00185', 'demo/HC-2026-00185/receta.pdf', 169877, 'enviado',    timestamptz '2026-09-04 08:35-05', timestamptz '2026-09-04 08:49-05'),
  ('HC-2026-00186', 'Nota de evolución', 'Nota de evolución 12', 'demo/HC-2026-00186/nota-12.pdf', 221904, 'recibido',  timestamptz '2026-09-04 10:18-05', null)
) as d(record_number, kind, title, storage_key, size_bytes, status, received_at, sent_at)
join clinical_records cr on cr.record_number = d.record_number
join users u on u.email = 'e.quispe@hospitaldemo.pe';

-- ─── Transcripciones ────────────────────────────────────────────────────────

insert into transcription_versions (document_id, version, origin, confidence, low_confidence_fields, created_by, created_at)
select d.id, v.version, v.origin::version_origin, v.confidence, v.low_fields, author.id, v.created_at
from (values
  ('Receta HC-2026-00182', 1, 'IA',     94,   array['dose'],      null,                        timestamptz '2026-09-04 09:14-05'),
  ('Receta HC-2026-00182', 2, 'MÉDICO', null, array[]::text[],    'c.mendoza@hospitaldemo.pe', timestamptz '2026-09-04 10:38-05'),
  ('Receta HC-2026-00182', 3, 'MÉDICO', null, array[]::text[],    'c.mendoza@hospitaldemo.pe', timestamptz '2026-09-04 10:41-05'),
  ('Receta HC-2026-00183', 1, 'IA',     97,   array[]::text[],    null,                        timestamptz '2026-09-04 09:45-05'),
  ('Receta HC-2026-00184', 1, 'IA',     91,   array['frequency'], null,                        timestamptz '2026-09-04 08:36-05'),
  ('Receta HC-2026-00185', 1, 'IA',     96,   array[]::text[],    null,                        timestamptz '2026-09-04 08:40-05')
) as v(title, version, origin, confidence, low_fields, author_email, created_at)
join documents d on d.title = v.title
left join users author on author.email = v.author_email;

insert into prescription_items (version_id, position, medication, dose, frequency, duration)
select tv.id, 1, i.medication, i.dose, i.frequency, i.duration
from (values
  ('Receta HC-2026-00182', 1, 'Amoxicilina', '500 mg', 'Cada 8 horas',       '7 días'),
  ('Receta HC-2026-00182', 2, 'Amoxicilina', '500 mg', 'Cada 8 horas',       '7 días'),
  ('Receta HC-2026-00182', 3, 'Amoxicilina', '500 mg', 'Cada 8 horas',       '7 días'),
  ('Receta HC-2026-00183', 1, 'Losartán',    '50 mg',  'Una vez al día',     '30 días'),
  ('Receta HC-2026-00184', 1, 'Paracetamol', '500 mg', 'Cada 6 horas',       '3 días'),
  ('Receta HC-2026-00185', 1, 'Omeprazol',   '20 mg',  'Antes del desayuno', '14 días')
) as i(title, version, medication, dose, frequency, duration)
join documents d on d.title = i.title
join transcription_versions tv on tv.document_id = d.id and tv.version = i.version;

-- Aprobación de la versión 3 (misma secuencia que seguirá la app: insertar, luego aprobar).
update transcription_versions tv
set status         = 'aprobada',
    approved_by    = u.id,
    approved_at    = '2026-09-04 10:42-05',
    content_sha256 = sha256(convert_to('Amoxicilina|500 mg|Cada 8 horas|7 días', 'UTF8'))
from documents d, users u
where tv.document_id = d.id
  and d.title = 'Receta HC-2026-00182'
  and tv.version = 3
  and u.email = 'c.mendoza@hospitaldemo.pe';

-- ─── Accesos excepcionales ──────────────────────────────────────────────────

insert into access_requests (requester_id, clinical_record_id, reason, justification, requested_window,
                             status, requested_at, decided_by, decided_at, expires_at)
select req.id, cr.id, a.reason::access_reason, a.justification, a.win::interval,
       a.status::access_status, a.requested_at, dec.id, a.decided_at, a.expires_at
from (values
  ('a.valdivia@clinicademo.pe',    'HC-00209',      'Emergencia médica',      'Paciente requiere evaluación inmediata en emergencia.',             '2 hours', 'vigente',   timestamptz '2026-09-04 09:54-05', null,                        timestamptz '2026-09-04 09:54-05', timestamptz '2026-09-04 11:54-05'),
  ('c.mendoza@hospitaldemo.pe',    'HC-2026-00184', 'Atención no programada', 'Interconsulta urgente fuera de la relación asistencial habitual.',  '1 hour',  'pendiente', timestamptz '2026-09-04 10:05-05', null,                        null,                              null),
  ('d.robles@centromedicodemo.pe', 'HC-00190',      'Emergencia médica',      'Traslado desde centro periférico sin vínculo previo.',              '4 hours', 'vencido',   timestamptz '2026-09-03 18:12-05', null,                        timestamptz '2026-09-03 18:12-05', timestamptz '2026-09-03 22:12-05'),
  ('c.mendoza@hospitaldemo.pe',    'HC-2026-00185', 'Otro',                   'Consulta exploratoria sin justificación clínica suficiente.',       '1 hour',  'denegado',  timestamptz '2026-09-03 16:40-05', 'l.paredes@hospitaldemo.pe', timestamptz '2026-09-03 17:02-05', null)
) as a(requester_email, record_number, reason, justification, win, status, requested_at, decider_email, decided_at, expires_at)
join users req           on req.email = a.requester_email
join clinical_records cr on cr.record_number = a.record_number
left join users dec      on dec.email = a.decider_email;

-- ─── Auditoría (en orden cronológico para que el id siga el tiempo) ────────

insert into audit_events (occurred_at, actor_id, actor_cmp, action, resource_type, resource_ref,
                          result, risk_score, auth_method, ip)
select e.occurred_at, u.id, pp.cmp, e.action, e.resource_type, e.resource_ref,
       e.result::audit_result, e.risk_score, e.auth::auth_method, e.ip::inet
from (values
  (1, timestamptz '2026-09-04 09:54-05', 'a.valdivia@clinicademo.pe', 'BREAK_GLASS',           'clinical_record', 'HC-00209',   'ALLOW',  61, 'WebAuthn', '203.0.113.88'),
  (2, timestamptz '2026-09-04 10:12-05', 'c.mendoza@hospitaldemo.pe', 'LOGIN_SUCCESS',         'session',         'Sesión 82A', 'ALLOW',   8, 'WebAuthn', '203.0.113.42'),
  (3, timestamptz '2026-09-04 10:30-05', null,                        'ANOMALY_DETECTED',      'session',         'Sesión 82A', 'REVIEW', 74, 'Sistema',  '203.0.113.42'),
  (4, timestamptz '2026-09-04 10:31-05', 'c.mendoza@hospitaldemo.pe', 'ACCESS_DENIED',         'clinical_record', 'HC-00441',   'DENY',   18, 'WebAuthn', '203.0.113.42'),
  (5, timestamptz '2026-09-04 10:38-05', 'c.mendoza@hospitaldemo.pe', 'TRANSCRIPTION_EDIT',    'clinical_record', 'HC-00182',   'ALLOW',  12, 'WebAuthn', '203.0.113.42'),
  (6, timestamptz '2026-09-04 10:42-05', 'c.mendoza@hospitaldemo.pe', 'TRANSCRIPTION_APPROVE', 'clinical_record', 'HC-00182',   'ALLOW',  12, 'WebAuthn', '203.0.113.42')
) as e(seq, occurred_at, email, action, resource_type, resource_ref, result, risk_score, auth, ip)
left join users u on u.email = e.email
left join professional_profiles pp on pp.user_id = u.id
order by e.seq;

-- ─── Alertas ────────────────────────────────────────────────────────────────

insert into alerts (title, detail, severity, status, assignee_id, audit_event_id, access_request_id, created_at, closed_at)
select a.title, a.detail, a.severity::alert_severity, a.status::alert_status, asg.id,
       (select id from audit_events where action = a.audit_action order by occurred_at desc limit 1),
       ar.id, a.created_at, a.closed_at
from (values
  ('Ritmo de revisión inusual',          '3 decisiones clínicas en menos de 4 segundos en la sesión 82A.', 'alta',  'abierta',     null,                        'ANOMALY_DETECTED', null,       timestamptz '2026-09-04 10:30-05', null),
  ('Acceso de emergencia abierto',       'Ana Valdivia solicitó break-glass sobre HC-00209.',               'alta',  'en revisión', 'l.paredes@hospitaldemo.pe', 'BREAK_GLASS',      'HC-00209', timestamptz '2026-09-04 09:54-05', null),
  ('Dispositivo nuevo verificado',       'Windows Hello se registró en un equipo no habitual.',             'media', 'abierta',     null,                        null,               null,       timestamptz '2026-08-28 12:00-05', null),
  ('Motor de transcripción IA inestable', 'Se detectaron interrupciones intermitentes en el servicio de IA.', 'baja', 'cerrada',     'r.huaman@hospitaldemo.pe',  null,               null,       timestamptz '2026-09-03 15:00-05', timestamptz '2026-09-03 17:30-05')
) as a(title, detail, severity, status, assignee_email, audit_action, access_record, created_at, closed_at)
left join users asg on asg.email = a.assignee_email
left join clinical_records cr on cr.record_number = a.access_record
left join access_requests ar on ar.clinical_record_id = cr.id and ar.status = 'vigente';

commit;
