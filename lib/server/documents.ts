import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { audit } from "@/lib/server/audit";
import { actorOf, type ServerSession } from "@/lib/server/auth";
import { sql, transaction } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import { extractPrescription } from "@/lib/server/vision";
import type { QueueItem, QueueStatus } from "@/lib/types";

// Vercel limita el cuerpo de una función a ~4,5 MB.
export const MAX_BYTES = 4 * 1024 * 1024;
export const EXTENSIONS: Record<string, string> = {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");
  const id = randomUUID();
  // Sin object storage configurado, el archivo se guarda en la propia fila (columna bytea).
  const storageKey = `uploads/${record.record_number}/${id}.${extension}`;

  await transaction(async (tx) => {
    await tx`
      insert into documents (id, clinical_record_id, kind, title, storage_key, mime_type, size_bytes, sha256, bytes, uploaded_by)
      values (${id}, ${recordId}, 'Receta', ${`Receta ${record.record_number}`}, ${storageKey}, ${file.type},
              ${file.size}, decode(${hash}, 'hex'), decode(${buffer.toString("hex")}, 'hex'), ${session.userId})`;
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

// El panel "Documento original" de /revision no mostraba esto: renderizaba una maqueta de
// papel armada con los campos ya transcritos, nunca el archivo real que subió Digitalización.
export async function getDocumentImage(session: ServerSession, documentId: string) {
  const [doc] = await sql`
    select d.mime_type, encode(d.bytes, 'hex') as bytes_hex,
           can_access_record(${session.userId}, cr.id) as allowed
    from documents d
    join clinical_records cr on cr.id = d.clinical_record_id
    where d.id = ${documentId} and cr.institution_id = ${session.institutionId}`;
  if (!doc) throw new ApiError(404, "Documento no encontrado.");
  if (!doc.allowed) {
    throw new ApiError(403, "No tienes relación asistencial ni acceso vigente para esta historia clínica.");
  }
  // Historiales de antes de guardar el archivo original (fixtures de prueba, migraciones viejas) no tienen bytes.
  if (!doc.bytes_hex) throw new ApiError(404, "Este documento no tiene un archivo original guardado.");
  return { mimeType: doc.mime_type as string, bytes: Buffer.from(doc.bytes_hex as string, "hex") };
}

export async function advanceDocument(session: ServerSession, id: string, status: "analizando" | "enviado") {
  const [document] = await sql`
    select d.status, d.mime_type, encode(d.bytes, 'hex') as bytes_hex, cr.record_number
    from documents d
    join clinical_records cr on cr.id = d.clinical_record_id
    where d.id = ${id} and cr.institution_id = ${session.institutionId}`;
  if (!document) throw new ApiError(404, "Documento no encontrado.");

  const expected = status === "analizando" ? "recibido" : "analizando";
  if (document.status !== expected) {
    throw new ApiError(409, `El documento está "${document.status}" y no puede pasar a "${status}".`);
  }

  // Se hace antes de abrir la transacción: es una llamada de red lenta y no debe retener la conexión.
  const extraction =
    status === "analizando" && document.bytes_hex
      ? await extractPrescription(Buffer.from(document.bytes_hex, "hex"), document.mime_type)
      : null;

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
      // Sin extracción (sin GEMINI_API_KEY, o el motor no pudo leer la imagen): propuesta vacía
      // para que el médico la complete a mano, igual que antes.
      const fields = extraction ?? {
        medication: "",
        dose: "",
        frequency: "",
        duration: "",
        confidence: 0,
        lowConfidenceFields: ["medication", "dose", "frequency", "duration"] as const,
      };
      const versionId = randomUUID();
      await tx`
        insert into transcription_versions (id, document_id, version, origin, confidence, low_confidence_fields)
        values (${versionId}, ${id}, 1, 'IA', ${fields.confidence}, ${fields.lowConfidenceFields})`;
      await tx`
        insert into prescription_items (version_id, position, medication, dose, frequency, duration)
        values (${versionId}, 1, ${fields.medication}, ${fields.dose}, ${fields.frequency}, ${fields.duration})`;
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
