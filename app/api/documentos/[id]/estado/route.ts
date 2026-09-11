import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { advanceDocument } from "@/lib/server/documents";
import { readId, readJson, route, type IdContext } from "@/lib/server/http";

const body = z.object({ status: z.enum(["analizando", "enviado"]) });

export const PATCH = route(async (request, context: IdContext) => {
  const session = await requireRole("DIGITALIZADOR");
  const id = await readId(context);
  const { status } = await readJson(request, body);
  await advanceDocument(session, id, status);
  return Response.json({ ok: true });
});
