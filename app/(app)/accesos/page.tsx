"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { TableSkeleton } from "@/components/Skeleton";
import { api, useApi } from "@/lib/client/api";
import { formatWhen } from "@/lib/format";
import type { AccessRequest, AccessStatus } from "@/lib/types";

const statusClass: Record<AccessStatus, string> = {
  pendiente: "warn",
  vigente: "ok",
  vencido: "bad",
  denegado: "bad",
};

type Decision = "aprobar" | "denegar" | "revocar";

export default function AccesosPage() {
  const requests = useApi<{ requests: AccessRequest[] }>("/api/accesos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = requests.data?.requests ?? [];
  const current = list.find((item) => item.id === selectedId) ?? list[0];

  const decide = async (id: string, decision: Decision) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/accesos/${id}`, { method: "PATCH", body: { decision } });
      requests.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Accesos excepcionales</h1>
          <p className="muted">Solicitudes de emergencia con ventana temporal.</p>
        </div>
      </div>
      <ErrorNote message={requests.error ?? error} />
      <div className="panel" style={{ marginBottom: 22 }}>
        {requests.loading && list.length === 0 ? (
          <TableSkeleton columns={4} />
        ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Solicitante</th>
              <th>Paciente</th>
              <th>Recurso</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                style={{ cursor: "pointer", background: current?.id === item.id ? "#f0f7f5" : "" }}
              >
                <td>{item.requester}</td>
                <td>{item.patient}</td>
                <td>{item.recordId}</td>
                <td>
                  <span className={`badge ${statusClass[item.status]}`}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      {current && (
        <div className="panel" style={{ maxWidth: 760 }}>
          <div className="panel-head">
            <b>{current.recordId}</b>
            <span className={`badge ${statusClass[current.status]}`}>{current.status}</span>
          </div>
          <div className="transcription">
            <div className="result-grid">
              <div>
                <span>Solicitante</span>
                <b>{current.requester}</b>
              </div>
              <div>
                <span>Paciente</span>
                <b>{current.patient}</b>
              </div>
              <div>
                <span>Motivo</span>
                <b>{current.reason}</b>
              </div>
              <div>
                <span>Ventana</span>
                <b>{current.window}</b>
              </div>
              <div>
                <span>Solicitado</span>
                <b>{formatWhen(current.requestedAt)}</b>
              </div>
              <div>
                <span>Vence</span>
                <b>{formatWhen(current.expiresAt)}</b>
              </div>
            </div>
            <p>{current.justification}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn primary"
                disabled={busy || current.status !== "pendiente"}
                onClick={() => decide(current.id, "aprobar")}
              >
                Aprobar
              </button>
              <button
                className="btn secondary"
                disabled={busy || current.status !== "pendiente"}
                onClick={() => decide(current.id, "denegar")}
              >
                Denegar
              </button>
              <button
                className="btn ghost"
                disabled={busy || current.status !== "vigente"}
                onClick={() => decide(current.id, "revocar")}
              >
                Revocar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
