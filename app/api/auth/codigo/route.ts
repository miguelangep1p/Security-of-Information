import { z } from "zod";
import { requestEmailCode } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";

const body = z.object({ email: z.email().max(254) });

export const POST = route(async (request) => {
  const { email } = await readJson(request, body);
  const { devCode } = await requestEmailCode(email);
  return Response.json({ sent: true, devCode });
});
