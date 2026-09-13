import { z } from "zod";
import { verifyRegistroCode } from "@/lib/server/registro";
import { readJson, route } from "@/lib/server/http";

const body = z.object({ email: z.email().max(254), code: z.string().regex(/^\d{6}$/) });

export const POST = route(async (request) => {
  const { email, code } = await readJson(request, body);
  return Response.json(await verifyRegistroCode(email, code));
});
