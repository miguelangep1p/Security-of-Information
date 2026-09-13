"use client";

import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { RowsSkeleton } from "@/components/Skeleton";
import { api, useApi } from "@/lib/client/api";
import type { ServiceStatus } from "@/lib/types";

export default function ConfiguracionPage() {
  const services = useApi<{ services: ServiceStatus[] }>("/api/sistema");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = services.data?.services ?? [];
  const operational = (service: string) => list.find((item) => item.service === service)?.operational ?? true;
  const ai = operational("transcription");
  const risk = operational("risk_engine");

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

  return (
    <>
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
