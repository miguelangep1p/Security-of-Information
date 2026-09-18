"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNote } from "@/components/ErrorNote";
import { api, useApi } from "@/lib/client/api";
import type { Institution, Role } from "@/lib/types";

export default function NuevoProfesionalPage() {
  const router = useRouter();
  const institutions = useApi<{ institutions: Institution[] }>("/api/instituciones");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cmp, setCmp] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [role, setRole] = useState<Role>("MÉDICO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = institutions.data?.institutions ?? [];
  const selectedInstitution = institutionId || options[0]?.id || "";

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/profesionales", {
        body: { fullName: name.trim(), email: email.trim(), cmp, institutionId: selectedInstitution, role },
      });
      router.push("/profesionales");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Registrar profesional</h1>
          <p className="muted">El alta queda en estado pendiente hasta la validación institucional.</p>
        </div>
      </div>
      <div className="panel" style={{ maxWidth: 640, padding: 28 }}>
        <ErrorNote message={institutions.error ?? error} />
        <div className="field">
          <label>Nombre completo</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellidos" />
        </div>
        <div className="field">
          <label>Correo institucional</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@hospitaldemo.pe"
          />
        </div>
        <div className="grid2">
          <div className="field">
            <label>CMP</label>
            <input
              value={cmp}
              onChange={(e) => setCmp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="084521"
            />
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="MÉDICO">Médico</option>
              <option value="ADMIN">Administrador</option>
              <option value="DIGITALIZADOR">Digitalizador</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Institución</label>
          <select value={selectedInstitution} onChange={(e) => setInstitutionId(e.target.value)}>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ghost" onClick={() => router.push("/profesionales")}>
            Cancelar
          </button>
          <button
            className="btn primary"
            disabled={busy || name.trim().length < 4 || !email.includes("@") || !selectedInstitution}
            onClick={save}
          >
            {busy ? "Guardando…" : "Guardar alta"}
          </button>
        </div>
      </div>
    </>
  );
}
