"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { TableSkeleton } from "@/components/Skeleton";
import { api, useApi } from "@/lib/client/api";
import { formatWhen } from "@/lib/format";
import type { MigrationBatch } from "@/lib/types";

export default function MigracionPage() {
  const router = useRouter();
  const batches = useApi<{ batches: MigrationBatch[] }>("/api/migraciones");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = batches.data?.batches ?? [];

  const createBatch = async () => {
    setCreating(true);
    setError(null);
    try {
      const created = await api<{ id: string }>("/api/migraciones", { method: "POST" });
      router.push(`/migracion/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Migración de actas</h1>
          <p className="muted">Sube lotes de documentos de archivo físico y vincúlalos a pacientes.</p>
        </div>
        <button className="btn primary" disabled={creating} onClick={createBatch}>
          {creating ? "Creando…" : "Nuevo lote"}
        </button>
      </div>
      <div className="verified" style={{ background: "#f2f5f4", color: "var(--ink)", borderColor: "var(--line)" }}>
        <Archive size={18} /> Cada acta la confirmas tú: vinculada a un paciente existente o dando de alta uno nuevo.
      </div>
      <ErrorNote message={batches.error ?? error} />
      <div className="panel">
        {batches.loading && list.length === 0 ? (
          <TableSkeleton columns={6} />
        ) : list.length === 0 ? (
          <div className="empty">Todavía no hay lotes de migración. Crea el primero.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Por revisar</th>
                <th>Vinculados</th>
                <th>Creados</th>
                <th>Descartados</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((batch) => (
                <tr key={batch.id}>
                  <td>{formatWhen(batch.createdAt)}</td>
                  <td>
                    <span className="badge warn">{batch.itemCounts.pendiente + batch.itemCounts.analizado}</span>
                  </td>
                  <td>
                    <span className="badge ok">{batch.itemCounts.vinculado}</span>
                  </td>
                  <td>
                    <span className="badge ok">{batch.itemCounts.creado}</span>
                  </td>
                  <td>
                    <span className="badge bad">{batch.itemCounts.descartado}</span>
                  </td>
                  <td>
                    <button className="btn secondary" onClick={() => router.push(`/migracion/${batch.id}`)}>
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
