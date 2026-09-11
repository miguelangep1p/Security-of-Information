import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { listInstitutions } from "@/lib/server/professionals";

export const GET = route(async () => {
  await requireRole("ADMIN");
  return Response.json({ institutions: await listInstitutions() });
});
