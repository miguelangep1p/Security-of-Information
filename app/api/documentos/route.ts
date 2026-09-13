import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { createDocument, listDocuments } from "@/lib/server/documents";
import { ApiError, route } from "@/lib/server/http";

const scope = z.enum(["pendientes", "enviados"]);

export const GET = route(async (request) => {
  const session = await requireRole("DIGITALIZADOR");
  const parsed = scope.safeParse(new URL(request.url).searchParams.get("estado") ?? "pendientes");
  if (!parsed.success) throw new ApiError(422, 'El parámetro "estado" debe ser pendientes o enviados.');
  return Response.json({ documents: await listDocuments(session, parsed.data) });
});

export const POST = route(async (request) => {
  const session = await requireRole("DIGITALIZADOR");
  const form = await request.formData().catch(() => {
    throw new ApiError(400, "Envía el archivo como multipart/form-data.");
  });
  const recordId = form.get("recordId");
  const file = form.get("file");
  if (typeof recordId !== "string" || !z.uuid().safeParse(recordId).success) {
    throw new ApiError(422, "Selecciona una historia clínica válida.");
  }
  if (!(file instanceof File)) throw new ApiError(422, "Adjunta un archivo.");
  return Response.json(await createDocument(session, recordId, file), { status: 201 });
});
