import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { audit } from "@/lib/server/audit";
import { actorOf, type ServerSession } from "@/lib/server/auth";
import { sql, transaction, type Row } from "@/lib/server/db";
import { EXTENSIONS, MAX_BYTES } from "@/lib/server/documents";
import { ApiError } from "@/lib/server/http";
import { createPatient, findOrCreateClinicalRecord, findPatientByDni, generateRecordNumber, backfillCareRelationships, type NewPatient } from "@/lib/server/patients";
import { extractMigrationFields, type PrescriptionExtraction } from "@/lib/server/vision";
import type { MigrationBatch, MigrationItem, MigrationItemStatus } from "@/lib/types";

export async function createMigrationBatch(session: ServerSession) {
  return transaction(async (tx) => {
    const [batch] = await tx`
      insert into migration_batches (institution_id, created_by) values (${session.institutionId}, ${session.userId})
      returning id`;
    await audit(tx, actorOf(session), {
      action: "MIGRATION_BATCH_CREATE",
      resourceType: "migration_batch",
      resourceRef: batch!.id,
      result: "ALLOW",
    });
    return { id: batch!.id as string };
  });
}

const EMPTY_COUNTS: Record<MigrationItemStatus, number> = {
  pendiente: 0,
  analizado: 0,
  vinculado: 0,
  creado: 0,
  descartado: 0,
};

export async function listMigrationBatches(session: ServerSession): Promise<MigrationBatch[]> {
  const rows = await sql`
    select b.id, b.created_at, i.status, count(i.id)::int as n
    from migration_batches b
    left join migration_items i on i.batch_id = b.id
    where b.institution_id = ${session.institutionId}
    group by b.id, b.created_at, i.status
    order by b.created_at desc`;

  const byId = new Map<string, MigrationBatch>();
  for (const row of rows) {
    const existing = byId.get(row.id) ?? { id: row.id, createdAt: row.created_at, itemCounts: { ...EMPTY_COUNTS } };
    if (row.status) existing.itemCounts[row.status as MigrationItemStatus] = row.n;
    byId.set(row.id, existing);
  }
  return [...byId.values()];
}

function toMigrationItem(row: Row): MigrationItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    filename: row.filename,
    status: row.status,
    ocrPatientName: row.ocr_patient_name ?? undefined,
    ocrPatientDni: row.ocr_patient_dni ?? undefined,
    ocrDocumentKind: row.ocr_document_kind ?? undefined,
    ocrConfidence: row.ocr_confidence ?? undefined,
    suggestedPatient: row.suggested_patient_id
      ? {
          id: row.suggested_patient_id,
          fullName: row.suggested_name,
          dni: row.suggested_dni ?? undefined,
          hasRecordHere: row.suggested_has_record,
        }
      : undefined,
    matchedPatientId: row.matched_patient_id ?? undefined,
    matchedClinicalRecordId: row.matched_clinical_record_id ?? undefined,
    resultingDocumentId: row.resulting_document_id ?? undefined,
  };
}

export async function listMigrationItems(session: ServerSession, batchId: string): Promise<MigrationItem[]> {
  const rows = await sql`
    select i.id, i.batch_id, i.filename, i.status, i.ocr_patient_name, i.ocr_patient_dni,
           i.ocr_document_kind, i.ocr_confidence, i.suggested_patient_id, i.matched_patient_id,
           i.matched_clinical_record_id, i.resulting_document_id,
           sp.full_name as suggested_name, sp.dni as suggested_dni,
           exists(
             select 1 from clinical_records cr
             where cr.patient_id = sp.id and cr.institution_id = ${session.institutionId}
           ) as suggested_has_record
    from migration_items i
    join migration_batches b on b.id = i.batch_id
    left join patients sp on sp.id = i.suggested_patient_id
    where i.batch_id = ${batchId} and b.institution_id = ${session.institutionId}
    order by i.created_at`;
  return rows.map(toMigrationItem);
}

export async function uploadMigrationItem(session: ServerSession, batchId: string, file: File) {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new ApiError(422, "Formato no permitido. Usa PDF, JPG o PNG.");
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new ApiError(422, "El archivo debe pesar como máximo 4 MB.");
  }

  const [batch] = await sql`
    select id from migration_batches where id = ${batchId} and institution_id = ${session.institutionId}`;
  if (!batch) throw new ApiError(404, "Lote no encontrado.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");

  // Llamada de red lenta antes de abrir la transacción, mismo motivo que advanceDocument
  // en lib/server/documents.ts: no debe retener la conexión de la transacción.
  const extraction = await extractMigrationFields(buffer, file.type);
  const dni = extraction?.patientDni?.trim();
  const suggested = dni && /^[0-9]{8}$/.test(dni) ? await findPatientByDni(dni, session.institutionId) : null;

  return transaction(async (tx) => {
    const [item] = await tx`
      insert into migration_items (
        batch_id, filename, mime_type, size_bytes, sha256, bytes, status,
        ocr_patient_name, ocr_patient_dni, ocr_document_kind, ocr_confidence, ocr_result, suggested_patient_id
      )
      values (
        ${batchId}, ${file.name}, ${file.type}, ${file.size}, decode(${hash}, 'hex'),
        decode(${buffer.toString("hex")}, 'hex'), ${extraction ? "analizado" : "pendiente"},
        ${extraction?.patientName || null}, ${extraction?.patientDni || null}, ${extraction?.documentKind ?? null},
        ${extraction?.confidence ?? null}, ${JSON.stringify(extraction ?? {})}, ${suggested?.id ?? null}
      )
      returning id`;
    await audit(tx, actorOf(session), {
      action: "MIGRATION_ITEM_UPLOAD",
      resourceType: "migration_item",
      resourceRef: file.name,
      result: "ALLOW",
      metadata: { itemId: item!.id, batchId, sha256: hash },
    });
    return { id: item!.id as string };
  });
}

export type MigrationDecision =
  | { type: "vincular"; patientId: string }
  | { type: "crear"; patient: NewPatient; recordNumber?: string }
  | { type: "descartar" };

export async function confirmMigrationItem(session: ServerSession, itemId: string, decision: MigrationDecision) {
  const [item] = await sql`
    select i.id, i.status, i.filename, i.mime_type, i.size_bytes, i.ocr_document_kind, i.ocr_result,
           encode(i.bytes, 'hex') as bytes_hex, encode(i.sha256, 'hex') as sha256_hex, b.institution_id
    from migration_items i
    join migration_batches b on b.id = i.batch_id
    where i.id = ${itemId} and b.institution_id = ${session.institutionId}`;
  if (!item) throw new ApiError(404, "Ítem no encontrado.");
  if (item.status === "vinculado" || item.status === "creado" || item.status === "descartado") {
    throw new ApiError(409, "Este ítem ya fue revisado.");
  }

  const actor = actorOf(session);

  if (decision.type === "descartar") {
    await sql`
      update migration_items set status = 'descartado', reviewed_by = ${session.userId}, reviewed_at = now()
      where id = ${itemId}`;
    await audit(sql, actor, {
      action: "MIGRATION_ITEM_DISCARD",
      resourceType: "migration_item",
      resourceRef: item.filename,
      result: "ALLOW",
      metadata: { itemId },
    });
    return { status: "descartado" as const };
  }

  if (!item.bytes_hex) throw new ApiError(409, "El archivo original ya no está disponible para este ítem.");

  const ocrResult = (item.ocr_result ?? {}) as Record<string, unknown>;
  const extraction: PrescriptionExtraction = {
    medication: String(ocrResult.medication ?? ""),
    dose: String(ocrResult.dose ?? ""),
    frequency: String(ocrResult.frequency ?? ""),
    duration: String(ocrResult.duration ?? ""),
    confidence: Number(ocrResult.confidence ?? 0),
    lowConfidenceFields: Array.isArray(ocrResult.lowConfidenceFields)
      ? (ocrResult.lowConfidenceFields as PrescriptionExtraction["lowConfidenceFields"])
      : ["medication", "dose", "frequency", "duration"],
  };
  const kind = item.ocr_document_kind || "Receta";
  const isPrescription = kind === "Receta";
  const noteSummary = typeof ocrResult.noteSummary === "string" ? ocrResult.noteSummary : "";

  return transaction(async (tx) => {
    let patientId: string;
    if (decision.type === "vincular") {
      const [patient] = await tx`select id from patients where id = ${decision.patientId}`;
      if (!patient) throw new ApiError(404, "Paciente no encontrado.");
      patientId = patient.id;
    } else {
      const created = await createPatient(tx, decision.patient);
      patientId = created.id;
      await audit(tx, actor, {
        action: "PATIENT_CREATE",
        resourceType: "patient",
        resourceRef: decision.patient.dni ?? decision.patient.fullName,
        result: "ALLOW",
        metadata: { patientId },
      });
    }

    const candidateRecordNumber =
      decision.type === "crear" && decision.recordNumber
        ? decision.recordNumber
        : await generateRecordNumber(tx, item.institution_id);
    const record = await findOrCreateClinicalRecord(tx, patientId, item.institution_id, candidateRecordNumber);
    // record.recordNumber es el número REAL de la historia (la ya existente o la recién creada) —
    // nunca el candidato de arriba si findOrCreateClinicalRecord terminó reusando una ya existente.
    const recordNumber = record.recordNumber;
    if (record.created) {
      await audit(tx, actor, {
        action: "CLINICAL_RECORD_CREATE",
        resourceType: "clinical_record",
        resourceRef: recordNumber,
        result: "ALLOW",
        metadata: { patientId, clinicalRecordId: record.id },
      });
      await backfillCareRelationships(tx, actor, patientId, item.institution_id, recordNumber);
    }

    const documentId = randomUUID();
    const storageKey = `migraciones/${recordNumber}/${documentId}.${EXTENSIONS[item.mime_type]}`;
    await tx`
      insert into documents (id, clinical_record_id, kind, title, storage_key, mime_type, size_bytes, sha256, bytes, uploaded_by)
      values (${documentId}, ${record.id}, ${kind}, ${`${kind} ${recordNumber}`}, ${storageKey}, ${item.mime_type},
              ${item.size_bytes}, decode(${item.sha256_hex}, 'hex'), decode(${item.bytes_hex}, 'hex'), ${session.userId})`;
    await audit(tx, actor, {
      action: "DOCUMENT_MIGRATE_IMPORT",
      resourceType: "document",
      resourceRef: recordNumber,
      result: "ALLOW",
      metadata: { documentId, migrationItemId: itemId },
    });

    // Reusa el ocr_result ya cacheado en la subida: no vuelve a llamar a Gemini.
    const versionId = randomUUID();
    await tx`
      insert into transcription_versions (id, document_id, version, origin, confidence, low_confidence_fields, note_text)
      values (${versionId}, ${documentId}, 1, 'IA', ${extraction.confidence}, ${extraction.lowConfidenceFields},
              ${isPrescription ? null : noteSummary || null})`;
    if (isPrescription) {
      await tx`
        insert into prescription_items (version_id, position, medication, dose, frequency, duration)
        values (${versionId}, 1, ${extraction.medication}, ${extraction.dose}, ${extraction.frequency}, ${extraction.duration})`;
    }
    await audit(tx, actor, {
      action: "DOCUMENT_ANALYZE",
      resourceType: "document",
      resourceRef: recordNumber,
      result: "ALLOW",
      metadata: { documentId },
    });

    // Confirmar un acta migrada la manda directo a revisión médica, igual que el flujo de
    // /digitalizar hoy (que encadena recibido→analizando→enviado sin pausa humana intermedia).
    await tx`update documents set status = 'analizando' where id = ${documentId}`;
    await tx`update documents set status = 'enviado', sent_to_review_at = now() where id = ${documentId}`;
    await audit(tx, actor, {
      action: "DOCUMENT_SEND_TO_REVIEW",
      resourceType: "document",
      resourceRef: recordNumber,
      result: "ALLOW",
      metadata: { documentId },
    });

    const itemStatus = decision.type === "vincular" ? "vinculado" : "creado";
    await tx`
      update migration_items
      set status = ${itemStatus}, matched_patient_id = ${patientId}, matched_clinical_record_id = ${record.id},
          resulting_document_id = ${documentId}, reviewed_by = ${session.userId}, reviewed_at = now(), bytes = null
      where id = ${itemId}`;

    return { status: itemStatus as "vinculado" | "creado", documentId };
  });
}
