import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { findPatientByDni, searchPatients } from "@/lib/server/patients";

export const GET = route(async (request) => {
  const session = await requireRole("DIGITALIZADOR");
  const params = new URL(request.url).searchParams;
  const dni = params.get("dni")?.trim();

  if (dni) {
    const match = /^[0-9]{8}$/.test(dni) ? await findPatientByDni(dni, session.institutionId) : null;
    return Response.json({ patients: match ? [match] : [] });
  }

  const query = params.get("query") ?? "";
  return Response.json({ patients: await searchPatients(query, session.institutionId) });
});
