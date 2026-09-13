import { z } from "zod";
import { submitRegistro } from "@/lib/server/registro";
import { readJson, route } from "@/lib/server/http";
import type { Session } from "@/lib/types";

const body = z.object({
  dni: z.string().regex(/^\d{8}$/),
  email: z.email().max(254),
  ticket: z.uuid(),
  cmp: z.string().regex(/^\d{1,6}$/),
  manualReview: z.boolean(),
  institutionId: z.uuid(),
});

// Paso final: crea usuario, perfil profesional y membership (Pendiente), e inicia sesión.
export const POST = route(async (request) => {
  const input = await readJson(request, body);
  const session: Session = await submitRegistro(input);
  return Response.json({ session });
});
