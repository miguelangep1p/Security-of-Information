import { requireRole } from "@/lib/server/auth";
import { listClinicalRecords } from "@/lib/server/clinical";
import { route } from "@/lib/server/http";

export const GET = route(async () => {
  const session = await requireRole("DIGITALIZADOR");
  return Response.json({ records: await listClinicalRecords(session) });
});
