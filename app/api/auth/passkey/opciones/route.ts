import { z } from "zod";
import { readJson, route } from "@/lib/server/http";
import { authenticationOptions } from "@/lib/server/passkeys";

const body = z.object({ email: z.email().max(254).optional() });

// Paso 1 del inicio de sesión con passkey. Sin correo, el navegador ofrece las passkeys guardadas.
export const POST = route(async (request) => {
  const { email } = await readJson(request, body);
  return Response.json(await authenticationOptions(email));
});
