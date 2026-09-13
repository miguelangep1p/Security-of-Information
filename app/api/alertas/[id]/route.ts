import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readId, readJson, route, type IdContext } from "@/lib/server/http";
import { updateAlert } from "@/lib/server/oversight";

const body = z
  .object({
    status: z.enum(["abierta", "en revisión", "cerrada"]).optional(),
    take: z.boolean().optional(),
  })
  .refine((patch) => patch.status || patch.take, "Indica status o take.");

export const PATCH = route(async (request, context: IdContext) => {
  const session = await requireRole("AUDITOR");
  const id = await readId(context);
  await updateAlert(session, id, await readJson(request, body));
  return Response.json({ ok: true });
});
