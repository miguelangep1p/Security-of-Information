import { requireRole } from "@/lib/server/auth";
import { findRecordByDni } from "@/lib/server/clinical";
import { EXTENSIONS, MAX_BYTES } from "@/lib/server/documents";
import { ApiError, route } from "@/lib/server/http";
import { identifyPatient } from "@/lib/server/vision";
import type { DocumentIdentity } from "@/lib/types";

// Identifica al paciente del archivo ANTES de subirlo, para preseleccionar su historia clínica.
// No persiste nada: el documento se crea recién en POST /api/documentos, con la historia que el
// digitalizador confirme. Por eso tampoco audita: no hay acceso a datos de un paciente concreto
// más allá de lo que este rol ya obtiene de /api/historias.
export const POST = route(async (request) => {
  const session = await requireRole("DIGITALIZADOR");
  const form = await request.formData().catch(() => {
    throw new ApiError(400, "Envía el archivo como multipart/form-data.");
  });

  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "Adjunta un archivo.");
  if (!EXTENSIONS[file.type]) throw new ApiError(422, "Formato no permitido. Usa PDF, JPG o PNG.");
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new ApiError(422, "El archivo debe pesar como máximo 4 MB.");
  }

  const identity = await identifyPatient(Buffer.from(await file.arrayBuffer()), file.type);
  if (!identity) {
    const body: DocumentIdentity = { patientName: "", patientDni: "", record: null, status: "sin-motor" };
    return Response.json(body);
  }

  const dni = identity.patientDni.trim();
  if (!/^[0-9]{8}$/.test(dni)) {
    const body: DocumentIdentity = {
      patientName: identity.patientName.trim(),
      patientDni: "",
      record: null,
      status: "sin-dni",
    };
    return Response.json(body);
  }

  const record = await findRecordByDni(dni, session.institutionId);
  const body: DocumentIdentity = {
    patientName: identity.patientName.trim(),
    patientDni: dni,
    record,
    status: record ? "emparejado" : "sin-historia",
  };
  return Response.json(body);
});
