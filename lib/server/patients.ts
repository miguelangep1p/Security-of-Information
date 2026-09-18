import "server-only";
import { audit, type Actor } from "@/lib/server/audit";
import { sql, type Row, type Sql } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import type { PatientMatch } from "@/lib/types";

const toMatch = (row: Row): PatientMatch => ({
  id: row.id,
  fullName: row.full_name,
  dni: row.dni ?? undefined,
  hasRecordHere: row.has_record,
});

// patients no tiene institution_id: la búsqueda es global, "hasRecordHere" distingue
// "ya tiene historia en esta institución" de "existe en otro lado, se le crearía una nueva aquí".
export async function findPatientByDni(dni: string, institutionId: string): Promise<PatientMatch | null> {
  const [row] = await sql`
    select p.id, p.full_name, p.dni,
           exists(select 1 from clinical_records cr where cr.patient_id = p.id and cr.institution_id = ${institutionId}) as has_record
    from patients p
    where p.dni = ${dni}`;
  return row ? toMatch(row) : null;
}

export async function searchPatients(query: string, institutionId: string): Promise<PatientMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = await sql`
    select p.id, p.full_name, p.dni,
           exists(select 1 from clinical_records cr where cr.patient_id = p.id and cr.institution_id = ${institutionId}) as has_record
    from patients p
    where p.dni = ${trimmed} or p.full_name ilike ${`%${trimmed}%`}
    order by p.full_name
    limit 20`;
  return rows.map(toMatch);
}

export type NewPatient = { fullName: string; dni?: string; birthDate?: string };

export async function createPatient(tx: Sql, input: NewPatient) {
  const fullName = input.fullName.trim();
  if (!fullName) throw new ApiError(422, "El paciente necesita un nombre.");
  const dni = input.dni?.trim() || null;
  if (dni && !/^[0-9]{8}$/.test(dni)) throw new ApiError(422, "El DNI debe tener 8 dígitos.");

  const [patient] = await tx`
    insert into patients (full_name, dni, birth_date)
    values (${fullName}, ${dni}, ${input.birthDate ?? null})
    returning id`;
  return { id: patient!.id as string };
}

// HC-{año}-{correlativo}: no hay generador previo en el repo (el seed mezcla formatos a mano).
// Editable por el digitalizador antes de confirmar, así que una colisión rara solo cae en el
// 409 genérico de fromDatabaseError (lib/server/http.ts) — no hace falta lógica de reintento.
export async function generateRecordNumber(tx: Sql, institutionId: string) {
  const [{ n }] = await tx`select count(*)::int as n from clinical_records where institution_id = ${institutionId}`;
  const year = new Date().getFullYear();
  return `HC-${year}-${String((n as number) + 1).padStart(5, "0")}`;
}

// created=true es lo que dispara el backfill de care_relationships: cubre tanto un paciente
// nuevo como uno existente (matcheado por DNI) que nunca tuvo historia en esta institución.
// Devuelve siempre el record_number REAL de la historia (la existente o la recién creada) —
// nunca el candidato generado por generateRecordNumber si terminó reusando una ya existente.
export async function findOrCreateClinicalRecord(
  tx: Sql,
  patientId: string,
  institutionId: string,
  candidateRecordNumber: string,
) {
  const [existing] = await tx`
    select id, record_number from clinical_records
    where patient_id = ${patientId} and institution_id = ${institutionId}`;
  if (existing) return { id: existing.id as string, recordNumber: existing.record_number as string, created: false };

  const [created] = await tx`
    insert into clinical_records (record_number, patient_id, institution_id)
    values (${candidateRecordNumber}, ${patientId}, ${institutionId})
    returning id, record_number`;
  return { id: created!.id as string, recordNumber: created!.record_number as string, created: true };
}

// Sin esto, un paciente migrado queda "Restringido" para todo médico (can_access_record no
// encuentra care_relationships) y solo sería revisable vía acceso de emergencia, que es el
// flujo equivocado para un archivo histórico. Otorga acceso permanente a todos los médicos
// habilitados de la institución en el momento de la migración (decisión de producto: MVP
// prioriza simplicidad sobre mínimo privilegio; sin vencimiento).
export async function backfillCareRelationships(
  tx: Sql,
  actor: Actor,
  patientId: string,
  institutionId: string,
  recordNumber: string,
) {
  await tx`
    insert into care_relationships (professional_id, patient_id, institution_id)
    select m.user_id, ${patientId}, ${institutionId}
    from memberships m
    where m.institution_id = ${institutionId} and m.role = 'MÉDICO' and m.status = 'Habilitado'`;
  await audit(tx, actor, {
    action: "CARE_RELATIONSHIP_BACKFILL",
    resourceType: "clinical_record",
    resourceRef: recordNumber,
    result: "ALLOW",
    metadata: { patientId, institutionId },
  });
}
