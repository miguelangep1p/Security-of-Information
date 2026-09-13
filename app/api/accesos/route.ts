import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";
import { listAccessRequests, requestEmergencyAccess } from "@/lib/server/oversight";

export const GET = route(async () => {
  await requireRole("AUDITOR");
  return Response.json({ requests: await listAccessRequests() });
});

const body = z.object({
  recordId: z.uuid(),
  reason: z.enum(["Emergencia médica", "Atención no programada", "Otro"]),
  justification: z.string().trim().min(10, "Justifica con al menos 10 caracteres.").max(500),
});

export const POST = route(async (request) => {
  const session = await requireRole("MÉDICO");
  const input = await readJson(request, body);
  return Response.json(await requestEmergencyAccess(session, input), { status: 201 });
});
