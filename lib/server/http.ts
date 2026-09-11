import "server-only";
import { z, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type IdContext = { params: Promise<{ id: string }> };

type Handler<C> = (request: Request, context: C) => Promise<Response>;

// Envuelve cada Route Handler: verifica el origen en mutaciones y traduce errores a JSON.
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : fromDatabaseError(error);
      if (apiError) return Response.json({ error: apiError.message }, { status: apiError.status });
      console.error(error);
      return Response.json({ error: "Error interno del servidor." }, { status: 500 });
    }
  };
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (new URL(origin).host !== host) throw new ApiError(403, "Origen no permitido.");
}

function fromDatabaseError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case "23505":
      return new ApiError(409, "Ya existe un registro con esos datos.");
    case "23502":
    case "23503":
    case "23514":
    case "22P02":
      return new ApiError(422, "Los datos no cumplen las reglas de la base de datos.");
    case "P0001":
      return new ApiError(409, (error as Error).message);
    default:
      return null;
  }
}

function validation(error: z.ZodError) {
  const detail = error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`);
  return new ApiError(422, detail.join("; "));
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => {
    throw new ApiError(400, "El cuerpo debe ser JSON válido.");
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw validation(parsed.error);
  return parsed.data;
}

export async function readId(context: IdContext) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Recurso no encontrado.");
  return id;
}
