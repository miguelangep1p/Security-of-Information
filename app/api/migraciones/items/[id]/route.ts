import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { readId, readJson, route, type IdContext } from "@/lib/server/http";
import { confirmMigrationItem } from "@/lib/server/migration";

const body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("vincular"), patientId: z.uuid() }),
  z.object({
    type: z.literal("crear"),
    patient: z.object({
      fullName: z.string().trim().min(1),
      dni: z
        .string()
        .regex(/^[0-9]{8}$/)
        .optional(),
      birthDate: z.string().optional(),
    }),
    recordNumber: z.string().trim().min(1).optional(),
  }),
  z.object({ type: z.literal("descartar") }),
]);

export const PATCH = route(async (request, context: IdContext) => {
  const session = await requireRole("DIGITALIZADOR");
  const id = await readId(context);
  const decision = await readJson(request, body);
  return Response.json(await confirmMigrationItem(session, id, decision));
});
