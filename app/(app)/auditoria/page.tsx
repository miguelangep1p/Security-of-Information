"use client";

import { useState } from "react";
import { ChevronRight, LockKeyhole } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { useApi } from "@/lib/client/api";
import { formatWhen } from "@/lib/format";
import type { AuditEvent, AuditResult } from "@/lib/types";

const results: Array<"Todos" | AuditResult> = ["Todos", "ALLOW", "DENY", "REVIEW"];

type AuditResponse = { events: AuditEvent[]; filters: { users: string[]; actions: string[] } };

export default function AuditoriaPage() {
  const [selected, setSelected] = useState(0);
  const [user, setUser] = useState("Todos");
  const [action, setAction] = useState("Todas");
  const [result, setResult] = useState<"Todos" | AuditResult>("Todos");
  const [open, setOpen] = useState<"none" | "user" | "action" | "result">("none");

  const params = new URLSearchParams();
  if (user !== "Todos") params.set("usuario", user);
  if (action !== "Todas") params.set("accion", action);
  if (result !== "Todos") params.set("resultado", result);
  const query = params.toString();
  const audit = useApi<AuditResponse>(`/api/auditoria${query ? `?${query}` : ""}`);

  const events = audit.data?.events ?? [];
  const users = ["Todos", ...(audit.data?.filters.users ?? [])];
  const actions = ["Todas", ...(audit.data?.filters.actions ?? [])];
  const current = events[Math.min(selected, Math.max(events.length - 1, 0))];

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Auditoría</h1>
          <p className="muted">Trazabilidad protegida de acciones relevantes.</p>
        </div>
        <span className="badge ok">
          <LockKeyhole size={12} style={{ display: "inline" }} /> Registro protegido
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <FilterButton
          label={`Usuario: ${user}`}
          open={open === "user"}
          onToggle={() => setOpen(open === "user" ? "none" : "user")}
          options={users}
          onPick={(value) => {
            setUser(value);
            setSelected(0);
            setOpen("none");
          }}
        />
        <FilterButton
          label={`Acción: ${action}`}
          open={open === "action"}
          onToggle={() => setOpen(open === "action" ? "none" : "action")}
          options={actions}
          onPick={(value) => {
            setAction(value);
            setSelected(0);
            setOpen("none");
          }}
        />
        <FilterButton
          label={`Resultado: ${result}`}
          open={open === "result"}
          onToggle={() => setOpen(open === "result" ? "none" : "result")}
          options={results}
          onPick={(value) => {
            setResult(value as "Todos" | AuditResult);
            setSelected(0);
            setOpen("none");
          }}
        />
      </div>
      <ErrorNote message={audit.error} />
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Recurso</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => (
              <tr
                key={event.id}
                onClick={() => setSelected(i)}
                style={{ cursor: "pointer", background: selected === i ? "#f0f7f5" : "" }}
              >
                <td>{formatWhen(event.time)}</td>
                <td>{event.user}</td>
                <td>{event.action}</td>
                <td>{event.resource}</td>
                <td>
                  <span className={`badge ${event.result === "DENY" ? "bad" : event.result === "REVIEW" ? "warn" : "ok"}`}>
                    {event.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {current ? (
          <div className="transcription" style={{ background: "#f7f9f8" }}>
            <b>Detalle del evento</b>
            <div className="result-grid">
              <div>
                <span>Usuario</span>
                <b>{current.user}</b>
              </div>
              <div>
                <span>CMP</span>
                <b>{current.cmp ?? "—"}</b>
              </div>
              <div>
                <span>Acción</span>
                <b>{current.action}</b>
              </div>
              <div>
                <span>Risk score</span>
                <b>
                  {current.riskScore} · {current.riskScore >= 60 ? "Alto" : "Bajo"}
                </b>
              </div>
              <div>
                <span>Autenticación</span>
                <b>{current.auth}</b>
              </div>
              <div>
                <span>Dirección IP</span>
                <b>{current.ip}</b>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty">{audit.loading ? "Cargando eventos…" : "No hay eventos para estos filtros."}</div>
        )}
      </div>
    </>
  );
}

function FilterButton({
  label,
  open,
  onToggle,
  options,
  onPick,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  options: string[];
  onPick: (value: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button className="btn secondary" onClick={onToggle}>
        {label} <ChevronRight size={14} />
      </button>
      {open && (
        <div
          className="panel"
          style={{
            position: "absolute",
            zIndex: 5,
            minWidth: 220,
            marginTop: 6,
            padding: 8,
          }}
        >
          {options.map((option) => (
            <button
              key={option}
              className="btn ghost"
              style={{ width: "100%", justifyContent: "flex-start" }}
              onClick={() => onPick(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
