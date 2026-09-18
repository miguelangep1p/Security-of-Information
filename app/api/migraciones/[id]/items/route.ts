import { requireRole } from "@/lib/server/auth";
import { ApiError, readId, route, type IdContext } from "@/lib/server/http";
import { listMigrationItems, uploadMigrationItem } from "@/lib/server/migration";

export const GET = route(async (_request, context: IdContext) => {
  const session = await requireRole("DIGITALIZADOR");
  const batchId = await readId(context);
  return Response.json({ items: await listMigrationItems(session, batchId) });
});

export const POST = route(async (request, context: IdContext) => {
  const session = await requireRole("DIGITALIZADOR");
  const batchId = await readId(context);
  const form = await request.formData().catch(() => {
    throw new ApiError(400, "Envía el archivo como multipart/form-data.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "Adjunta un archivo.");
  return Response.json(await uploadMigrationItem(session, batchId, file), { status: 201 });
});
