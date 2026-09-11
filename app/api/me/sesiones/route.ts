import { revokeOtherSessions } from "@/lib/server/account";
import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";

// Cierra todas las sesiones del usuario excepto la actual.
export const DELETE = route(async () => {
  const session = await requireRole();
  return Response.json(await revokeOtherSessions(session));
});
