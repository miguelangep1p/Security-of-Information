import { requireRole } from "@/lib/server/auth";
import { readId, route, type IdContext } from "@/lib/server/http";
import { grantAllRecordsToProfessional } from "@/lib/server/professionals";

export const POST = route(async (_request, context: IdContext) => {
  const session = await requireRole("ADMIN");
  const id = await readId(context);
  return Response.json(await grantAllRecordsToProfessional(session, id));
});
