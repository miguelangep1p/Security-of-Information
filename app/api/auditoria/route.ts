import { z } from "zod";
import { listAuditEvents } from "@/lib/server/audit";
import { requireRole } from "@/lib/server/auth";
import { ApiError, route } from "@/lib/server/http";

const query = z.object({
  usuario: z.string().max(120).optional(),
  accion: z.string().regex(/^[A-Z_]+$/).optional(),
  resultado: z.enum(["ALLOW", "DENY", "REVIEW"]).optional(),
});

export const GET = route(async (request) => {
  await requireRole("ADMIN");
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = query.safeParse(params);
  if (!parsed.success) throw new ApiError(422, "Filtros de auditoría inválidos.");
  const { usuario, accion, resultado } = parsed.data;
  return Response.json(await listAuditEvents({ user: usuario, action: accion, result: resultado }));
});
