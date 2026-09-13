import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { registrationOptions } from "@/lib/server/passkeys";

// Paso 1 del registro: el servidor genera el desafío para la sesión actual.
export const POST = route(async () => {
  const session = await requireRole();
  return Response.json(await registrationOptions(session));
});
