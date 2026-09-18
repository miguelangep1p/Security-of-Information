import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readId, readJson, route, type IdContext } from "@/lib/server/http";
import { updateProfessional } from "@/lib/server/professionals";

const body = z
  .object({
    role: z.enum(["MÉDICO", "ADMIN", "DIGITALIZADOR"]).optional(),
    status: z.enum(["Habilitado", "Suspendido"]).optional(),
  })
  .refine((patch) => patch.role || patch.status, "Indica role o status.");

export const PATCH = route(async (request, context: IdContext) => {
  const session = await requireRole("ADMIN");
  const id = await readId(context);
  await updateProfessional(session, id, await readJson(request, body));
  return Response.json({ ok: true });
});
