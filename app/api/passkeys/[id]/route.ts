import { requireRole } from "@/lib/server/auth";
import { readId, route, type IdContext } from "@/lib/server/http";
import { deletePasskey } from "@/lib/server/passkeys";

export const DELETE = route(async (_request, context: IdContext) => {
  const session = await requireRole();
  await deletePasskey(session, await readId(context));
  return Response.json({ ok: true });
});
