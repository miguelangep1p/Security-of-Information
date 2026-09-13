import { listPublicInstitutions } from "@/lib/server/registro";
import { route } from "@/lib/server/http";

// A diferencia de /api/instituciones (solo ADMIN), esta lista es pública: el paso 3 del
// registro la necesita antes de que exista cualquier sesión.
export const GET = route(async () => {
  return Response.json({ institutions: await listPublicInstitutions() });
});
