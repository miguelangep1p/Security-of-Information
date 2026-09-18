import { requireRole } from "@/lib/server/auth";
import { getDocumentImage } from "@/lib/server/documents";
import { readId, route, type IdContext } from "@/lib/server/http";

export const GET = route(async (_request, context: IdContext) => {
  const session = await requireRole("MÉDICO");
  const id = await readId(context);
  const { mimeType, bytes } = await getDocumentImage(session, id);
  return new Response(bytes, {
    headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=60" },
  });
});
