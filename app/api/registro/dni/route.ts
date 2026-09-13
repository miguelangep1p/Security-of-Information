import { z } from "zod";
import { checkDni } from "@/lib/server/registro";
import { readJson, route } from "@/lib/server/http";

const body = z.object({ dni: z.string().regex(/^\d{8}$/) });

// Paso 1 del registro: consulta de identidad (simulación RENIEC). Público, sin sesión.
export const POST = route(async (request) => {
  const { dni } = await readJson(request, body);
  return Response.json(await checkDni(dni));
});
