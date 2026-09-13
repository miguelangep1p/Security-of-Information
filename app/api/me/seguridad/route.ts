import { getSecurityOverview } from "@/lib/server/account";
import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";

export const GET = route(async () => {
  const session = await requireRole();
  return Response.json(await getSecurityOverview(session));
});
