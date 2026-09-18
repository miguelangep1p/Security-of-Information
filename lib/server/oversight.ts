import "server-only";
import { audit } from "@/lib/server/audit";
import { actorOf, type ServerSession } from "@/lib/server/auth";
import { sql, transaction } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import type { AccessReason, AccessRequest, AlertItem, AlertStatus, RiskThreshold, ServiceStatus } from "@/lib/types";

// ─── Alertas ────────────────────────────────────────────────────────────────

export async function listAlerts(): Promise<AlertItem[]> {
  const rows = await sql`
    select a.id, a.title, a.detail, a.severity, a.status, a.created_at, u.short_name as assignee
    from alerts a
    left join users u on u.id = a.assignee_id
    order by a.status = 'cerrada', a.created_at desc
    limit 100`;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    detail: row.detail,
    severity: row.severity,
    status: row.status,
    time: row.created_at,
    assignee: row.assignee ?? undefined,
  }));
}

export async function updateAlert(
  session: ServerSession,
  id: string,
  patch: { status?: AlertStatus; take?: boolean },
) {
  const [current] = await sql`select title, status from alerts where id = ${id}`;
  if (!current) throw new ApiError(404, "Alerta no encontrada.");
  const status: AlertStatus = patch.status ?? (patch.take ? "en revisión" : current.status);

  await transaction(async (tx) => {
    await tx`
      update alerts
      set status = ${status},
          assignee_id = case when ${patch.take === true} then ${session.userId}::uuid else assignee_id end,
          closed_at = case when ${status} = 'cerrada' then coalesce(closed_at, now()) end
      where id = ${id}`;
    await audit(tx, actorOf(session), {
      action: "ALERT_UPDATE",
      resourceType: "alert",
      resourceRef: current.title,
      result: "ALLOW",
      metadata: { from: current.status, to: status, take: patch.take === true },
    });
  });
}

// ─── Accesos excepcionales (break-glass) ────────────────────────────────────

export async function listAccessRequests(): Promise<AccessRequest[]> {
  // Pendientes primero (requieren acción de un auditor); el resto, más reciente primero.
  const rows = await sql`
    select id, requester, patient, record_id, reason, justification, status, requested_at, expires_at,
           extract(epoch from requested_window)::int / 3600 as window_hours
    from access_requests_view
    order by status <> 'pendiente', requested_at desc
    limit 100`;
  return rows.map((row) => ({
    id: row.id,
    requester: row.requester,
    patient: row.patient,
    recordId: row.record_id,
    reason: row.reason,
    justification: row.justification,
    status: row.status,
    requestedAt: row.requested_at,
    window: row.window_hours === 1 ? "1 hora" : `${row.window_hours} horas`,
    expiresAt: row.expires_at,
  }));
}

export async function requestEmergencyAccess(
  session: ServerSession,
  input: { recordId: string; reason: AccessReason; justification: string },
) {
  const [record] = await sql`
    select cr.record_number,
           can_access_record(${session.userId}, cr.id) as allowed,
           exists (select 1 from access_requests ar
                   where ar.clinical_record_id = cr.id and ar.requester_id = ${session.userId}
                     and ar.status = 'pendiente') as pending
    from clinical_records cr
    where cr.id = ${input.recordId} and cr.institution_id = ${session.institutionId}`;
  if (!record) throw new ApiError(404, "Historia clínica no encontrada.");
  if (record.allowed) throw new ApiError(409, "Ya tienes acceso a esta historia clínica.");
  if (record.pending) throw new ApiError(409, "Ya tienes una solicitud pendiente para esta historia clínica.");

  // Una emergencia se concede al instante (ventana de 2 h) y se alerta al auditor; el resto espera aprobación.
  const emergency = input.reason === "Emergencia médica";
  const justification = input.justification.trim();

  return transaction(async (tx) => {
    const [request] = emergency
      ? await tx`
          insert into access_requests (requester_id, clinical_record_id, reason, justification,
                                       requested_window, status, decided_at, expires_at)
          values (${session.userId}, ${input.recordId}, ${input.reason}, ${justification},
                  interval '2 hours', 'vigente', now(), now() + interval '2 hours')
          returning id, status`
      : await tx`
          insert into access_requests (requester_id, clinical_record_id, reason, justification, requested_window)
          values (${session.userId}, ${input.recordId}, ${input.reason}, ${justification}, interval '1 hour')
          returning id, status`;

    const [event] = await audit(tx, actorOf(session), {
      action: emergency ? "BREAK_GLASS" : "BREAK_GLASS_REQUEST",
      resourceType: "clinical_record",
      resourceRef: record.record_number,
      result: emergency ? "ALLOW" : "REVIEW",
      riskScore: emergency ? 61 : 35,
      metadata: { accessRequestId: request!.id, reason: input.reason },
    });

    if (emergency) {
      await tx`
        insert into alerts (title, detail, severity, audit_event_id, access_request_id)
        values ('Acceso de emergencia abierto',
                ${`${session.shortName} abrió break-glass sobre ${record.record_number}.`},
                'alta', ${event!.id}, ${request!.id})`;
    }
    return { id: request!.id as string, status: request!.status as AccessRequest["status"] };
  });
}

export type AccessDecision = "aprobar" | "denegar" | "revocar";

export async function decideAccessRequest(session: ServerSession, id: string, decision: AccessDecision) {
  const [current] = await sql`
    select ar.requester_id, ar.status, coalesce(ar.expires_at > now(), false) as active, cr.record_number
    from access_requests ar
    join clinical_records cr on cr.id = ar.clinical_record_id
    where ar.id = ${id}`;
  if (!current) throw new ApiError(404, "Solicitud no encontrada.");
  if (current.requester_id === session.userId) {
    throw new ApiError(403, "No puedes resolver una solicitud propia.");
  }

  const allowed = decision === "revocar" ? current.status === "vigente" && current.active : current.status === "pendiente";
  if (!allowed) throw new ApiError(409, `No se puede ${decision} una solicitud en estado "${current.status}".`);

  await transaction(async (tx) => {
    const updated =
      decision === "aprobar"
        ? await tx`
            update access_requests
            set status = 'vigente', decided_by = ${session.userId}, decided_at = now(),
                expires_at = now() + requested_window
            where id = ${id} and status = 'pendiente' returning id`
        : decision === "denegar"
          ? await tx`
              update access_requests
              set status = 'denegado', decided_by = ${session.userId}, decided_at = now()
              where id = ${id} and status = 'pendiente' returning id`
          : await tx`
              update access_requests
              set status = 'vencido', decided_by = ${session.userId}, expires_at = now()
              where id = ${id} and status = 'vigente' returning id`;
    if (updated.length === 0) throw new ApiError(409, "La solicitud cambió de estado. Recarga la lista.");

    const action = { aprobar: "ACCESS_APPROVE", denegar: "ACCESS_DENY", revocar: "ACCESS_REVOKE" }[decision];
    await audit(tx, actorOf(session), {
      action,
      resourceType: "clinical_record",
      resourceRef: current.record_number,
      result: decision === "aprobar" ? "ALLOW" : "DENY",
      metadata: { accessRequestId: id },
    });
  });
}

// ─── Estado del sistema ─────────────────────────────────────────────────────

export async function listServices(): Promise<ServiceStatus[]> {
  const rows = await sql`
    select service, label, operational, updated_at from service_status
    order by array_position(array['identity', 'application', 'transcription', 'audit', 'risk_engine'], service)`;
  return rows.map((row) => ({
    service: row.service,
    label: row.label,
    operational: row.operational,
    updatedAt: row.updated_at,
  }));
}

export async function setServiceStatus(session: ServerSession, service: string, operational: boolean) {
  await transaction(async (tx) => {
    const updated = await tx`
      update service_status set operational = ${operational}, updated_by = ${session.userId}
      where service = ${service} returning label`;
    if (updated.length === 0) throw new ApiError(404, "Servicio no encontrado.");
    await audit(tx, actorOf(session), {
      action: "SERVICE_STATUS_CHANGE",
      resourceType: "service",
      resourceRef: updated[0]!.label,
      result: "ALLOW",
      metadata: { operational },
    });
  });
}

// ─── Umbral de "ritmo de revisión inusual" ──────────────────────────────────

export async function getRiskThreshold(): Promise<RiskThreshold> {
  const [row] = await sql`select max_decisions, window_seconds, updated_at from risk_thresholds where id`;
  return { maxDecisions: row!.max_decisions, windowSeconds: row!.window_seconds, updatedAt: row!.updated_at };
}

export async function setRiskThreshold(
  session: ServerSession,
  patch: { maxDecisions: number; windowSeconds: number },
) {
  await transaction(async (tx) => {
    await tx`
      update risk_thresholds
      set max_decisions = ${patch.maxDecisions}, window_seconds = ${patch.windowSeconds}, updated_by = ${session.userId}
      where id`;
    await audit(tx, actorOf(session), {
      action: "RISK_THRESHOLD_CHANGE",
      resourceType: "risk_threshold",
      resourceRef: "Ritmo de revisión",
      result: "ALLOW",
      metadata: patch,
    });
  });
}
