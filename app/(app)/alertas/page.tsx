"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { api, useApi } from "@/lib/client/api";
import { formatWhen } from "@/lib/format";
import type { AlertItem, AlertStatus } from "@/lib/types";

const severityClass = {
  alta: "bad",
  media: "warn",
  baja: "ok",
} as const;

export default function AlertasPage() {
  const alerts = useApi<{ alerts: AlertItem[] }>("/api/alertas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = alerts.data?.alerts ?? [];
  const current = list.find((item) => item.id === selectedId) ?? list[0];

  const update = async (id: string, patch: { status?: AlertStatus; take?: boolean }) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/alertas/${id}`, { method: "PATCH", body: patch });
      alerts.reload();
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
          <h1>Alertas</h1>
          <p className="muted">Señales de riesgo, no un veredicto de identidad.</p>
        </div>
      </div>
      <ErrorNote message={alerts.error ?? error} />
      <div className="review-layout">
        <div className="panel">
          {alerts.loading && list.length === 0 && <div className="empty">Cargando alertas…</div>}
          {list.map((item) => (
            <button
              key={item.id}
              className="listrow"
              style={{
                width: "100%",
                background: current?.id === item.id ? "#f0f7f5" : "white",
                border: 0,
                borderTop: "1px solid var(--line)",
              }}
              onClick={() => setSelectedId(item.id)}
            >
              <div style={{ textAlign: "left" }}>
                <b>{item.title}</b>
                <div className="muted" style={{ fontSize: 12 }}>
                  {formatWhen(item.time)} · {item.status}
                </div>
              </div>
              <span className={`badge ${severityClass[item.severity]}`}>{item.severity}</span>
            </button>
          ))}
        </div>
        {current && (
          <div className="panel">
            <div className="panel-head">
              <b>{current.title}</b>
              <span className={`badge ${severityClass[current.severity]}`}>{current.status}</span>
            </div>
            <div className="transcription">
              <p>{current.detail}</p>
              <div className="result-grid">
                <div>
                  <span>Severidad</span>
                  <b>{current.severity}</b>
                </div>
                <div>
                  <span>Asignado</span>
                  <b>{current.assignee ?? "Sin asignar"}</b>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => update(current.id, { take: true })}
                >
                  Tomar alerta
                </button>
                {(["abierta", "en revisión", "cerrada"] as AlertStatus[]).map((status) => (
                  <button
                    key={status}
                    className="btn ghost"
                    disabled={busy || current.status === status}
                    onClick={() => update(current.id, { status })}
                  >
                    Marcar {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
