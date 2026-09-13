import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { audit } from "@/lib/server/audit";
import { actorOf, type ServerSession } from "@/lib/server/auth";
import { sql, transaction } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import type { QueueItem, QueueStatus } from "@/lib/types";

// Vercel limita el cuerpo de una función a ~4,5 MB.
const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function listDocuments(session: ServerSession, scope: "pendientes" | "enviados") {
  const statuses: QueueStatus[] = scope === "pendientes" ? ["recibido", "analizando"] : ["enviado"];
  const rows = await sql`
    select d.id, d.title, d.status, d.received_at, p.full_name as patient
    from documents d
    join clinical_records cr on cr.id = d.clinical_record_id
    join patients p          on p.id = cr.patient_id
    where cr.institution_id = ${session.institutionId}
      and d.status::text = any(${statuses})
    order by d.received_at desc
    limit 100`;
  return rows.map(
    (row): QueueItem => ({
      id: row.id,
      patient: row.patient,
      document: row.title,
      status: row.status,
      receivedAt: row.received_at,
    }),
  );
}

export async function createDocument(session: ServerSession, recordId: string, file: File) {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new ApiError(422, "Formato no permitido. Usa PDF, JPG o PNG.");
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new ApiError(422, "El archivo debe pesar como máximo 4 MB.");
  }

  const [record] = await sql`
    select record_number from clinical_records
    where id = ${recordId} and institution_id = ${session.institutionId}`;
  if (!record) throw new ApiError(404, "Historia clínica no encontrada.");

  const hash = createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
  const id = randomUUID();
  // Sin object storage configurado se registran la huella y los metadatos; el archivo no se conserva.
  const storageKey = `uploads/${record.record_number}/${id}.${extension}`;

  await transaction(async (tx) => {
    await tx`
      insert into documents (id, clinical_record_id, kind, title, storage_key, mime_type, size_bytes, sha256, uploaded_by)
      values (${id}, ${recordId}, 'Receta', ${`Receta ${record.record_number}`}, ${storageKey}, ${file.type},
              ${file.size}, decode(${hash}, 'hex'), ${session.userId})`;
    await audit(tx, actorOf(session), {
      action: "DOCUMENT_UPLOAD",
      resourceType: "document",
      resourceRef: record.record_number,
      result: "ALLOW",
      metadata: { documentId: id, sha256: hash },
    });
  });

  return { id, sha256: hash };
}

export async function advanceDocument(session: ServerSession, id: string, status: "analizando" | "enviado") {
  const [document] = await sql`
    select d.status, cr.record_number
    from documents d
    join clinical_records cr on cr.id = d.clinical_record_id
    where d.id = ${id} and cr.institution_id = ${session.institutionId}`;
  if (!document) throw new ApiError(404, "Documento no encontrado.");

  const expected = status === "analizando" ? "recibido" : "analizando";
  if (document.status !== expected) {
    throw new ApiError(409, `El documento está "${document.status}" y no puede pasar a "${status}".`);
  }

  await transaction(async (tx) => {
    const moved =
      status === "analizando"
        ? await tx`update documents set status = 'analizando' where id = ${id} and status = 'recibido' returning id`
        : await tx`
            update documents set status = 'enviado', sent_to_review_at = now()
            where id = ${id} and status = 'analizando'
              and exists (select 1 from transcription_versions v where v.document_id = documents.id)
            returning id`;
    if (moved.length === 0) throw new ApiError(409, "El estado del documento cambió. Recarga la lista.");

    if (status === "analizando") {
      // Motor IA simulado: crea una propuesta vacía y marcada para que el médico la complete.
      const versionId = randomUUID();
      await tx`
        insert into transcription_versions (id, document_id, version, origin, confidence, low_confidence_fields)
        values (${versionId}, ${id}, 1, 'IA', 0, array['medication', 'dose', 'frequency', 'duration'])`;
      await tx`
        insert into prescription_items (version_id, position, medication, dose, frequency, duration)
        values (${versionId}, 1, '', '', '', '')`;
    }

    await audit(tx, actorOf(session), {
      action: status === "analizando" ? "DOCUMENT_ANALYZE" : "DOCUMENT_SEND_TO_REVIEW",
      resourceType: "document",
      resourceRef: document.record_number,
      result: "ALLOW",
      metadata: { documentId: id },
    });
  });
}
