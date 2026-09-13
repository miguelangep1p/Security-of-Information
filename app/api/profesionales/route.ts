import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";
import { createProfessional, listProfessionals } from "@/lib/server/professionals";

export const GET = route(async () => {
  await requireRole("ADMIN");
  return Response.json({ professionals: await listProfessionals() });
});

const body = z.object({
  fullName: z.string().trim().min(4).max(120),
  email: z.email().max(254),
  cmp: z
    .string()
    .regex(/^\d{1,6}$/, "El CMP tiene hasta 6 dígitos.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  institutionId: z.uuid(),
  role: z.enum(["MÉDICO", "ADMIN", "AUDITOR", "DIGITALIZADOR"]),
});

export const POST = route(async (request) => {
  const session = await requireRole("ADMIN");
  const input = await readJson(request, body);
  return Response.json(await createProfessional(session, input), { status: 201 });
});
