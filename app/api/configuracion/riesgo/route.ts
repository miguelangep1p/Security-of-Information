import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";
import { getRiskThreshold, setRiskThreshold } from "@/lib/server/oversight";

// Cualquier sesión válida puede leerlo: /revision (MÉDICO) lo necesita para aplicar la alerta.
export const GET = route(async () => {
  await requireRole();
  return Response.json(await getRiskThreshold());
});

const body = z.object({
  maxDecisions: z.number().int().min(1).max(20),
  windowSeconds: z.number().int().min(1).max(120),
});

export const PATCH = route(async (request) => {
  const session = await requireRole("ADMIN");
  await setRiskThreshold(session, await readJson(request, body));
  return Response.json(await getRiskThreshold());
});
