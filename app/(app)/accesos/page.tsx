"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { TableSkeleton } from "@/components/Skeleton";
import { Toast } from "@/components/Toast";
import { api, useApi } from "@/lib/client/api";
import { useFlash } from "@/lib/client/useFlash";
import { formatWhen } from "@/lib/format";
import type { AccessRequest, AccessStatus } from "@/lib/types";

const statusClass: Record<AccessStatus, string> = {
  pendiente: "warn",
  vigente: "ok",
  vencido: "bad",
  denegado: "bad",
};

type Decision = "aprobar" | "denegar" | "revocar";

const decisionLabel: Record<Decision, string> = {
  aprobar: "Aprobar",
  denegar: "Denegar",
  revocar: "Revocar",
};

const decisionBusyLabel: Record<Decision, string> = {
  aprobar: "Aprobando…",
  denegar: "Denegando…",
  revocar: "Revocando…",
};

const decisionDoneLabel: Record<Decision, string> = {
  aprobar: "aprobada",
  denegar: "denegada",
  revocar: "revocada",
};

export default function AccesosPage() {
  const requests = useApi<{ requests: AccessRequest[] }>("/api/accesos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyDecision, setBusyDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, flash] = useFlash();
  const list = requests.data?.requests ?? [];
  // La lista llega con pendientes primero; si no eligieron nada, aterriza en la que sí requiere acción.
  const current = list.find((item) => item.id === selectedId) ?? list.find((item) => item.status === "pendiente") ?? list[0];

  const decide = async (id: string, decision: Decision, recordId: string) => {
    setBusyDecision(decision);
    setError(null);
    try {
      await api(`/api/accesos/${id}`, { method: "PATCH", body: { decision } });
      flash(`Solicitud de ${recordId} ${decisionDoneLabel[decision]}.`);
      requests.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyDecision(null);
    }
  };

  return (
    <>
      <Toast message={note} />
      <div className="pagehead">
        <div>
          <h1>Accesos excepcionales</h1>
          <p className="muted">Solicitudes de emergencia con ventana temporal.</p>
        </div>
      </div>
      <ErrorNote message={requests.error ?? error} />
      <div className="split-grid">
        <div className="panel">
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
          <div className="panel" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
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
                  disabled={busyDecision !== null || current.status !== "pendiente"}
                  onClick={() => decide(current.id, "aprobar", current.recordId)}
                >
                  {busyDecision === "aprobar" ? decisionBusyLabel.aprobar : decisionLabel.aprobar}
                </button>
                <button
                  className="btn secondary"
                  disabled={busyDecision !== null || current.status !== "pendiente"}
                  onClick={() => decide(current.id, "denegar", current.recordId)}
                >
                  {busyDecision === "denegar" ? decisionBusyLabel.denegar : decisionLabel.denegar}
                </button>
                <button
                  className="btn ghost"
                  disabled={busyDecision !== null || current.status !== "vigente"}
                  onClick={() => decide(current.id, "revocar", current.recordId)}
                >
                  {busyDecision === "revocar" ? decisionBusyLabel.revocar : decisionLabel.revocar}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
