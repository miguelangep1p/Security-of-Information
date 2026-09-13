import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { audit } from "@/lib/server/audit";
import { actorOf, sessionRef, type ServerSession } from "@/lib/server/auth";
import { sql, transaction, type Row } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import type {
  ClinicalRecordOption,
  HistoryDocument,
  HistoryVersion,
  ReviewField,
  ReviewItem,
  ReviewQueue,
} from "@/lib/types";

export type Prescription = { medication: string; dose: string; frequency: string; duration: string };

const PRESCRIPTION_KEYS = ["medication", "dose", "frequency", "duration"] as const;

const FIELD_FROM_DB: Record<(typeof PRESCRIPTION_KEYS)[number], ReviewField> = {
  medication: "med",
  dose: "dose",
  frequency: "freq",
  duration: "duration",
};

// Mismo formato que db/seed.sql: campos separados por "|", un medicamento por línea.
export function prescriptionHash(items: Prescription[]) {
  const content = items.map((item) => PRESCRIPTION_KEYS.map((key) => item[key]).join("|")).join("\n");
  return createHash("sha256").update(content, "utf8").digest("hex");
}

const toPrescription = (row: Row): Prescription => ({
  medication: row.medication,
  dose: row.dose,
  frequency: row.frequency,
  duration: row.duration,
});

export async function listReviewQueue(session: ServerSession): Promise<ReviewQueue> {
  const [rows, [today]] = await Promise.all([
    sql`
      select q.version_id, q.document_id, q.clinical_record_id, q.record_number, q.patient, q.confidence,
             q.low_confidence_fields, q.sent_to_review_at,
             can_access_record(${session.userId}, q.clinical_record_id) as allowed,
             i.medication, i.dose, i.frequency, i.duration
      from review_queue_view q
      join clinical_records cr on cr.id = q.clinical_record_id
      left join prescription_items i on i.version_id = q.version_id and i.position = 1
      where cr.institution_id = ${session.institutionId}
      order by q.sent_to_review_at, q.record_number`,
    sql`
      select count(*)::int as approved
      from transcription_versions
      where approved_by = ${session.userId}
        and approved_at >= date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima'`,
  ]);

  // Sin relación asistencial ni break-glass vigente, el contenido clínico no sale del servidor.
  const items = rows.map((row): ReviewItem => {
    const restricted = !row.allowed;
    return {
      versionId: row.version_id,
      documentId: row.document_id,
      recordId: row.clinical_record_id,
      recordNumber: row.record_number,
      patient: restricted ? null : row.patient,
      med: restricted ? "" : (row.medication ?? ""),
      dose: restricted ? "" : (row.dose ?? ""),
      freq: restricted ? "" : (row.frequency ?? ""),
      duration: restricted ? "" : (row.duration ?? ""),
      confidence: restricted ? null : row.confidence,
      lowFields: restricted
        ? []
        : (row.low_confidence_fields as (keyof typeof FIELD_FROM_DB)[]).map((field) => FIELD_FROM_DB[field]),
      restricted,
      sentAt: row.sent_to_review_at,
    };
  });

  return { items, approvedToday: today.approved };
}

export async function approveTranscription(
  session: ServerSession,
  versionId: string,
  corrections?: Partial<Prescription>,
) {
  const [target] = await sql`
    select tv.document_id, tv.version, tv.status, d.status as document_status,
           cr.record_number, cr.institution_id,
           tv.version = (select max(v.version) from transcription_versions v where v.document_id = tv.document_id) as is_latest,
           can_access_record(${session.userId}, cr.id) as allowed
    from transcription_versions tv
    join documents d         on d.id = tv.document_id
    join clinical_records cr on cr.id = d.clinical_record_id
    where tv.id = ${versionId}`;
  if (!target || target.institution_id !== session.institutionId) {
    throw new ApiError(404, "Transcripción no encontrada.");
  }

  const actor = actorOf(session);
  const resourceRef: string = target.record_number;
  if (!target.allowed) {
    await audit(sql, actor, { action: "ACCESS_DENIED", resourceType: "clinical_record", resourceRef, result: "DENY" });
    throw new ApiError(403, "No tienes relación asistencial ni acceso vigente para esta historia clínica.");
  }
  if (target.status !== "pendiente" || !target.is_latest || target.document_status !== "enviado") {
    throw new ApiError(409, "Esta transcripción ya fue validada o reemplazada. Recarga la cola.");
  }

  const current = (
    await sql`
      select medication, dose, frequency, duration from prescription_items
      where version_id = ${versionId} order by position`
  ).map(toPrescription);
  if (current.length === 0) throw new ApiError(422, "La transcripción no tiene medicamentos.");

  const next = current.map((item, index) => {
    if (index > 0 || !corrections) return item;
    const trimmed = Object.fromEntries(
      Object.entries(corrections).map(([key, value]) => [key, value?.trim()]),
    ) as Partial<Prescription>;
    return { ...item, ...trimmed };
  });
  if (next.some((item) => PRESCRIPTION_KEYS.some((key) => !item[key]?.trim()))) {
    throw new ApiError(422, "Completa todos los campos de la receta antes de validar.");
  }
  const changed = next.some((item, i) => PRESCRIPTION_KEYS.some((key) => item[key] !== current[i]![key]));
  const hash = prescriptionHash(next);

  return transaction(async (tx) => {
    let approvedId = versionId;
    let version: number = target.version;

    // Corregir nunca modifica la versión existente: crea la siguiente con origen MÉDICO.
    if (changed) {
      approvedId = randomUUID();
      version += 1;
      await tx`
        insert into transcription_versions (id, document_id, version, origin, created_by)
        values (${approvedId}, ${target.document_id}, ${version}, 'MÉDICO', ${session.userId})`;
      for (const [index, item] of next.entries()) {
        await tx`
          insert into prescription_items (version_id, position, medication, dose, frequency, duration)
          values (${approvedId}, ${index + 1}, ${item.medication}, ${item.dose}, ${item.frequency}, ${item.duration})`;
      }
      await audit(tx, actor, {
        action: "TRANSCRIPTION_EDIT",
        resourceType: "clinical_record",
        resourceRef,
        result: "ALLOW",
        metadata: { version },
      });
    }

    const approved = await tx`
      update transcription_versions
      set status = 'aprobada', approved_by = ${session.userId}, approved_at = now(),
          approval_session_id = ${session.sessionId}, content_sha256 = decode(${hash}, 'hex')
      where id = ${approvedId} and status = 'pendiente'
      returning version`;
    if (approved.length === 0) {
      throw new ApiError(409, "Otra persona validó esta transcripción al mismo tiempo.");
    }
    await audit(tx, actor, {
      action: "TRANSCRIPTION_APPROVE",
      resourceType: "clinical_record",
      resourceRef,
      result: "ALLOW",
      metadata: { version },
    });

    return { versionId: approvedId, version, corrected: changed };
  });
}

export async function reportReviewAnomaly(session: ServerSession, reason: string) {
  const [recent] = await sql`
    select 1 from audit_events
    where session_id = ${session.sessionId} and action = 'ANOMALY_DETECTED'
      and occurred_at > now() - interval '10 minutes'
    limit 1`;
  if (recent) return { created: false };

  const ref = sessionRef(session.sessionId);
  await transaction(async (tx) => {
    const [event] = await audit(
      tx,
      { ...actorOf(session), userId: null, cmp: null, authMethod: "Sistema" },
      {
        action: "ANOMALY_DETECTED",
        resourceType: "session",
        resourceRef: ref,
        result: "REVIEW",
        riskScore: 74,
        metadata: { reason, userId: session.userId },
      },
    );
    await tx`update sessions set risk_score = greatest(risk_score, 74) where id = ${session.sessionId}`;
    await tx`
      insert into alerts (title, detail, severity, audit_event_id)
      values ('Ritmo de revisión inusual', ${`${reason} · ${session.shortName} · ${ref}.`}, 'alta', ${event!.id})`;
  });
  return { created: true };
}

export async function listApprovedHistory(session: ServerSession): Promise<HistoryDocument[]> {
  const documents = await sql`
    select d.id, d.title, cr.record_number, p.full_name as patient, encode(d.sha256, 'hex') as original_hash,
           max(v.approved_at) as last_approved_at
    from documents d
    join clinical_records cr       on cr.id = d.clinical_record_id
    join patients p                on p.id = cr.patient_id
    join transcription_versions v  on v.document_id = d.id and v.status = 'aprobada'
    where cr.institution_id = ${session.institutionId}
      and can_access_record(${session.userId}, cr.id)
    group by d.id, cr.record_number, p.full_name
    order by last_approved_at desc
    limit 20`;
  if (documents.length === 0) return [];

  const versions = await sql`
    select v.document_id, v.version, v.origin, v.status, v.created_at, v.approved_at,
           u.full_name as approved_by, pp.cmp as approved_by_cmp, s.auth_method as approval_method,
           encode(v.content_sha256, 'hex') as content_hash,
           coalesce(
             json_agg(json_build_object('medication', i.medication, 'dose', i.dose,
                                        'frequency', i.frequency, 'duration', i.duration)
                      order by i.position) filter (where i.version_id is not null),
             '[]') as items
    from transcription_versions v
    left join users u                  on u.id = v.approved_by
    left join professional_profiles pp on pp.user_id = v.approved_by
    left join sessions s               on s.id = v.approval_session_id
    left join prescription_items i     on i.version_id = v.id
    where v.document_id = any(${documents.map((document) => document.id)}::uuid[])
    group by v.id, u.full_name, pp.cmp, s.auth_method
    order by v.version desc`;

  return documents.map((document) => {
    const rows = versions.filter((row) => row.document_id === document.id);
    const toVersion = (row: Row): HistoryVersion => ({
      version: row.version,
      origin: row.origin,
      status: row.status,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      approvedByCmp: row.approved_by_cmp,
      approvalMethod: row.approval_method,
      contentHash: row.content_hash,
    });
    const currentRow = rows.find((row) => row.status === "aprobada")!;
    return {
      id: document.id,
      title: document.title,
      recordNumber: document.record_number,
      patient: document.patient,
      originalHash: document.original_hash,
      // Se recalcula el hash con los medicamentos guardados y se compara con el sellado al aprobar.
      integrityVerified: currentRow.content_hash === prescriptionHash(currentRow.items),
      current: toVersion(currentRow),
      versions: rows.map(toVersion),
    };
  });
}

export async function listClinicalRecords(session: ServerSession): Promise<ClinicalRecordOption[]> {
  const rows = await sql`
    select cr.id, cr.record_number, p.full_name as patient
    from clinical_records cr
    join patients p on p.id = cr.patient_id
    where cr.institution_id = ${session.institutionId}
    order by cr.record_number`;
  return rows.map((row) => ({ id: row.id, recordNumber: row.record_number, patient: row.patient }));
}
