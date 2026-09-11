"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { roleLabel } from "@/lib/nav";
import type { Professional } from "@/lib/types";

const statusClass: Record<Professional["status"], string> = {
  Habilitado: "ok",
  Pendiente: "warn",
  Suspendido: "bad",
};

export default function ProfesionalesPage() {
  const { session } = useSession();
  const router = useRouter();
  const professionals = useApi<{ professionals: Professional[] }>("/api/profesionales");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = professionals.data?.professionals ?? [];

  const setStatus = async (id: string, status: "Habilitado" | "Suspendido") => {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/profesionales/${id}`, { method: "PATCH", body: { status } });
      professionals.reload();
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
          <h1>Profesionales</h1>
          <p className="muted">Gestión operativa sin acceso al contenido clínico.</p>
        </div>
        <button className="btn primary" onClick={() => router.push("/profesionales/nuevo")}>
          Registrar profesional
        </button>
      </div>
      <div
        className="verified"
        style={{ background: "#f2f5f4", color: "var(--ink)", borderColor: "var(--line)" }}
      >
        <ShieldCheck size={19} /> Separación de funciones: este rol no puede revisar ni aprobar
        documentos clínicos.
      </div>
      <ErrorNote message={professionals.error ?? error} />
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>CMP</th>
              <th>Institución</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {item.email}
                  </div>
                </td>
                <td>{item.cmp}</td>
                <td>{item.institution}</td>
                <td>{roleLabel[item.role]}</td>
                <td>
                  <span className={`badge ${statusClass[item.status]}`}>
                    {item.status}
                    {item.cmp !== "—" && item.status === "Habilitado" ? " · CMP verificado" : ""}
                  </span>
                </td>
                <td>
                  {item.userId !== session?.userId &&
                    (item.status === "Habilitado" ? (
                      <button
                        className="btn ghost"
                        disabled={busyId === item.id}
                        onClick={() => setStatus(item.id, "Suspendido")}
                      >
                        Suspender
                      </button>
                    ) : (
                      <button
                        className="btn secondary"
                        disabled={busyId === item.id}
                        onClick={() => setStatus(item.id, "Habilitado")}
                      >
                        Habilitar
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {professionals.loading && list.length === 0 && <div className="empty">Cargando profesionales…</div>}
      </div>
    </>
  );
}
