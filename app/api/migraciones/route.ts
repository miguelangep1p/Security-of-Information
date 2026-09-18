import { requireRole } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { createMigrationBatch, listMigrationBatches } from "@/lib/server/migration";

export const GET = route(async () => {
  const session = await requireRole("DIGITALIZADOR");
  return Response.json({ batches: await listMigrationBatches(session) });
});

export const POST = route(async () => {
  const session = await requireRole("DIGITALIZADOR");
  return Response.json(await createMigrationBatch(session), { status: 201 });
});
