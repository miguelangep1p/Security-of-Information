import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readId, readJson, route, type IdContext } from "@/lib/server/http";
import { decideAccessRequest } from "@/lib/server/oversight";

const body = z.object({ decision: z.enum(["aprobar", "denegar", "revocar"]) });

export const PATCH = route(async (request, context: IdContext) => {
  const session = await requireRole("ADMIN");
  const id = await readId(context);
  const { decision } = await readJson(request, body);
  await decideAccessRequest(session, id, decision);
  return Response.json({ ok: true });
});
