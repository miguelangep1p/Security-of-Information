import { z } from "zod";
import { loginWithEmailCode } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";

const body = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/, "El código tiene 6 dígitos."),
});

export const POST = route(async (request) => {
  const { email, code } = await readJson(request, body);
  return Response.json({ session: await loginWithEmailCode(email, code) });
});
