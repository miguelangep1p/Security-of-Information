import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { approveTranscription } from "@/lib/server/clinical";
import { readId, readJson, route, type IdContext } from "@/lib/server/http";

const field = z.string().max(120);
const body = z.object({
  corrections: z
    .object({ medication: field, dose: field, frequency: field, duration: field })
    .partial()
    .optional(),
});

export const POST = route(async (request, context: IdContext) => {
  const session = await requireRole("MÉDICO");
  const id = await readId(context);
  const { corrections } = await readJson(request, body);
  return Response.json(await approveTranscription(session, id, corrections));
});
