import { requireRole } from "@/lib/server/auth";
import { listReviewQueue } from "@/lib/server/clinical";
import { route } from "@/lib/server/http";

export const GET = route(async () => {
  const session = await requireRole("MÉDICO");
  return Response.json(await listReviewQueue(session));
});
