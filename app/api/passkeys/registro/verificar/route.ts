import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";
import { credentialSchema, verifyRegistration } from "@/lib/server/passkeys";

const body = z.object({ response: credentialSchema });

// Paso 2 del registro: verifica la respuesta del autenticador y guarda la llave pública.
export const POST = route(async (request) => {
  const session = await requireRole();
  const { response } = await readJson(request, body);
  const passkey = await verifyRegistration(session, response as unknown as RegistrationResponseJSON);
  return Response.json({ passkey }, { status: 201 });
});
