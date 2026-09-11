import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { listRoles } from "@/lib/server/professionals";

export const GET = route(async () => {
  await requireRole("ADMIN");
  return Response.json({ roles: await listRoles() });
});
