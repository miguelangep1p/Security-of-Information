"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { api, useApi } from "@/lib/client/api";
import { formatWhen } from "@/lib/format";
import type { QueueItem, QueueStatus } from "@/lib/types";

const statusLabel: Record<QueueStatus, string> = {
  recibido: "Recibido",
  analizando: "Analizando",
  enviado: "Enviado a revisión",
};

export default function PendientesPage() {
  const documents = useApi<{ documents: QueueItem[] }>("/api/documentos?estado=pendientes");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = documents.data?.documents ?? [];

  const advance = async (id: string, status: "analizando" | "enviado") => {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/documentos/${id}/estado`, { method: "PATCH", body: { status } });
      documents.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Pendientes</h1>
          <p className="muted">Cola de documentos en preparación. No se puede aprobar desde aquí.</p>
        </div>
      </div>
      <div
        className="verified"
        style={{ background: "#f2f5f4", color: "var(--ink)", borderColor: "var(--line)" }}
      >
        <LockKeyhole size={18} /> El digitalizador entrega el documento; el médico decide.
      </div>
      <ErrorNote message={documents.error ?? error} />
      <div className="panel">
        {documents.loading && pending.length === 0 ? (
          <div className="empty">Cargando documentos…</div>
        ) : pending.length === 0 ? (
          <div className="empty">No hay documentos pendientes. Todo fue enviado a revisión.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Paciente</th>
                <th>Recibido</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((item) => (
                <tr key={item.id}>
                  <td>{item.document}</td>
                  <td>{item.patient}</td>
                  <td>{formatWhen(item.receivedAt)}</td>
                  <td>
                    <span className={`badge ${item.status === "analizando" ? "warn" : "ok"}`}>
                      {statusLabel[item.status]}
                    </span>
                  </td>
                  <td>
                    {item.status === "recibido" && (
                      <button
                        className="btn secondary"
                        disabled={busyId === item.id}
                        onClick={() => advance(item.id, "analizando")}
                      >
                        Analizar
                      </button>
                    )}
                    {item.status === "analizando" && (
                      <button
                        className="btn primary"
                        disabled={busyId === item.id}
                        onClick={() => advance(item.id, "enviado")}
                      >
                        Enviar a revisión
                      </button>
                    )}
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
