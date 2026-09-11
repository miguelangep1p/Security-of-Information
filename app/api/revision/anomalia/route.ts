import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { reportReviewAnomaly } from "@/lib/server/clinical";
import { readJson, route } from "@/lib/server/http";

const body = z.object({ reason: z.string().trim().min(3).max(200) });

export const POST = route(async (request) => {
  const session = await requireRole("MÉDICO");
  const { reason } = await readJson(request, body);
  return Response.json(await reportReviewAnomaly(session, reason));
});
