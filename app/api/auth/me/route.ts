import { getSession, publicSession } from "@/lib/server/auth";
import { route } from "@/lib/server/http";

export const GET = route(async () => {
  const session = await getSession();
  return Response.json({ session: session ? publicSession(session) : null });
});
