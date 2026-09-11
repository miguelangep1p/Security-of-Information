import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { readJson, route } from "@/lib/server/http";
import { credentialSchema, loginWithPasskey } from "@/lib/server/passkeys";

const body = z.object({ response: credentialSchema });

// Paso 2: verifica la firma con la llave pública guardada y abre la sesión.
export const POST = route(async (request) => {
  const { response } = await readJson(request, body);
  const session = await loginWithPasskey(response as unknown as AuthenticationResponseJSON);
  return Response.json({ session });
});
