import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { listAlerts } from "@/lib/server/oversight";

export const GET = route(async () => {
  await requireRole("AUDITOR");
  return Response.json({ alerts: await listAlerts() });
});
