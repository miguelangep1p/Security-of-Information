import { z } from "zod";
import { listDemoUsers, loginDemo } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";

// Perfiles de demostración y Passkey simulada. Responde 404 si NEXO_DEMO_MODE no es "true".
export const GET = route(async () => {
  return Response.json({ users: await listDemoUsers() });
});

const body = z.object({ email: z.email().max(254) });

export const POST = route(async (request) => {
  const { email } = await readJson(request, body);
  return Response.json({ session: await loginDemo(email) });
});
