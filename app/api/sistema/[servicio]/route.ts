import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";
import { setServiceStatus } from "@/lib/server/oversight";

const body = z.object({ operational: z.boolean() });

export const PATCH = route(async (request, context: { params: Promise<{ servicio: string }> }) => {
  const session = await requireRole("ADMIN");
  const { servicio } = await context.params;
  const { operational } = await readJson(request, body);
  await setServiceStatus(session, servicio, operational);
  return Response.json({ ok: true });
});
