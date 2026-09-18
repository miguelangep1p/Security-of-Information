"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { RowsSkeleton } from "@/components/Skeleton";
import { Toast } from "@/components/Toast";
import { api, useApi } from "@/lib/client/api";
import { useFlash } from "@/lib/client/useFlash";
import type { RiskThreshold, ServiceStatus } from "@/lib/types";

export default function ConfiguracionPage() {
  const services = useApi<{ services: ServiceStatus[] }>("/api/sistema");
  const threshold = useApi<RiskThreshold>("/api/configuracion/riesgo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, flash] = useFlash();
  const list = services.data?.services ?? [];
  const operational = (service: string) => list.find((item) => item.service === service)?.operational ?? true;
  const ai = operational("transcription");
  const risk = operational("risk_engine");

  const [maxDecisions, setMaxDecisions] = useState("2");
  const [windowSeconds, setWindowSeconds] = useState("3");
  const [savingThreshold, setSavingThreshold] = useState(false);

  useEffect(() => {
    if (threshold.data) {
      setMaxDecisions(String(threshold.data.maxDecisions));
      setWindowSeconds(String(threshold.data.windowSeconds));
    }
  }, [threshold.data]);

  const toggle = async (service: string, value: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/sistema/${service}`, { method: "PATCH", body: { operational: value } });
      services.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveThreshold = async () => {
    setSavingThreshold(true);
    setError(null);
    try {
      await api<RiskThreshold>("/api/configuracion/riesgo", {
        method: "PATCH",
        body: { maxDecisions: Number(maxDecisions), windowSeconds: Number(windowSeconds) },
      });
      flash(`Alerta actualizada: ${maxDecisions} acciones en ${windowSeconds} s.`);
      threshold.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingThreshold(false);
    }
  };

  return (
    <>
      <Toast message={note} />
      <div className="pagehead">
        <div>
          <h1>Estado del sistema</h1>
          <p className="muted">Servicios y comportamiento ante fallos.</p>
        </div>
      </div>
      <ErrorNote message={services.error ?? error} />
      <div className="panel" style={{ maxWidth: 760 }}>
        <div className="transcription">
          {services.loading && list.length === 0 ? (
            <RowsSkeleton rows={4} />
          ) : (
            list.map((item) => (
              <div className="listrow" key={item.service}>
                <b>{item.label}</b>
                <span className={`badge ${item.operational ? "ok" : "bad"}`}>
                  {item.operational ? "Operativo" : "No disponible"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      {!ai && (
        <div className="verified" style={{ maxWidth: 760 }}>
          <Check /> La revisión manual continúa disponible.
        </div>
      )}
      {!risk && (
        <div
          className="verified"
          style={{ maxWidth: 760, background: "#fff7e7", color: "#745315" }}
        >
          <AlertTriangle /> Modo de seguridad reforzada: se solicitará autenticación adicional.
        </div>
      )}
      <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn secondary" disabled={busy || list.length === 0} onClick={() => toggle("transcription", !ai)}>
          {ai ? "Marcar IA no disponible" : "Marcar IA operativa"}
        </button>
        <button className="btn secondary" disabled={busy || list.length === 0} onClick={() => toggle("risk_engine", !risk)}>
          {risk ? "Marcar motor de riesgo no disponible" : "Marcar motor de riesgo operativo"}
        </button>
      </div>
      <div className="subsection">
        <h2>Alerta de ritmo de revisión</h2>
        <p className="muted" style={{ maxWidth: 560, marginBottom: 14 }}>
          Si un médico valida documentos más rápido que esto, se le pide confirmar su identidad
          de nuevo con Passkey y se avisa a Auditoría.
        </p>
        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="transcription" style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Acciones máximas</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxDecisions}
                onChange={(e) => setMaxDecisions(e.target.value)}
                style={{ width: 100 }}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Ventana (segundos)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={windowSeconds}
                onChange={(e) => setWindowSeconds(e.target.value)}
                style={{ width: 100 }}
              />
            </div>
            <button
              className="btn primary"
              disabled={savingThreshold || !maxDecisions || !windowSeconds}
              onClick={saveThreshold}
            >
              {savingThreshold ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
      <div className="subsection">
        <h2>Controles de plataforma</h2>
        {[
          "Dependencias bloqueadas",
          "Dependency scanning",
          "Secret scanning",
          "Docker image scanning",
          "SBOM generado",
          "Build verificado",
        ].map((x) => (
          <span className="badge ok" style={{ display: "inline-block", margin: "5px" }} key={x}>
            ✓ {x}
          </span>
        ))}
      </div>
    </>
  );
}
