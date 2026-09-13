import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { listServices } from "@/lib/server/oversight";

export const GET = route(async () => {
  await requireRole("ADMIN");
  return Response.json({ services: await listServices() });
});
