import { z } from "zod";
import { requestRegistroCode } from "@/lib/server/registro";
import { readJson, route } from "@/lib/server/http";

const body = z.object({ email: z.email().max(254) });

export const POST = route(async (request) => {
  const { email } = await readJson(request, body);
  return Response.json(await requestRegistroCode(email));
});
