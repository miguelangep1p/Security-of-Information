import { requireRole } from "@/lib/server/auth";
import { listApprovedHistory } from "@/lib/server/clinical";
import { route } from "@/lib/server/http";

export const GET = route(async () => {
  const session = await requireRole("MÉDICO");
  return Response.json({ documents: await listApprovedHistory(session) });
});
