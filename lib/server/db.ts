import "server-only";
import { Client, neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Las filas llegan sin tipo desde Postgres; cada servicio las mapea a los tipos de lib/types.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (configúrala en .env.local o en Vercel).");
  return url;
}

let http: NeonQueryFunction<false, false> | null = null;

// Consultas sueltas por HTTP: la vía más rápida en serverless. Los valores viajan como parámetros.
export const sql: Sql = (strings, ...values) => {
  http ??= neon(connectionString());
  return http(strings, ...values);
};

// Transacción interactiva (WebSocket) para operaciones de varios pasos que deben ser atómicas.
export async function transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T> {
  const client = new Client(connectionString());
  await client.connect();
  const tx: Sql = async (strings, ...values) => {
    const text = strings.slice(1).reduce((query, part, i) => `${query}$${i + 1}${part}`, strings[0]);
    const result = await client.query(text, values);
    return result.rows;
  };
  try {
    await client.query("begin");
    const value = await work(tx);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}
