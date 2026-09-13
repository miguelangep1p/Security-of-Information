"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { TableSkeleton } from "@/components/Skeleton";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { roleLabel } from "@/lib/nav";
import type { Professional, Role, RoleDefinition } from "@/lib/types";

const permissionLabels = [
  ["reviewClinical", "Revisar clínica"],
  ["approveClinical", "Aprobar clínica"],
  ["digitize", "Digitalizar"],
  ["viewAudit", "Ver auditoría"],
  ["manageUsers", "Gestionar usuarios"],
] as const;

export default function RolesPage() {
  const { session } = useSession();
  const roles = useApi<{ roles: RoleDefinition[] }>("/api/roles");
  const professionals = useApi<{ professionals: Professional[] }>("/api/profesionales");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changeRole = async (id: string, role: Role) => {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/profesionales/${id}`, { method: "PATCH", body: { role } });
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
          <h1>Roles</h1>
          <p className="muted">Permisos por rol y a quién se asignan.</p>
        </div>
      </div>
      <div
        className="verified"
        style={{ background: "#f2f5f4", color: "var(--ink)", borderColor: "var(--line)" }}
      >
        <ShieldCheck size={19} /> Un administrador no obtiene acceso clínico al cambiar roles.
      </div>
      <ErrorNote message={roles.error ?? professionals.error ?? error} />
      <div className="panel" style={{ marginBottom: 28 }}>
        {roles.loading && !roles.data ? (
          <TableSkeleton columns={6} rows={4} />
        ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Rol</th>
              {permissionLabels.map(([, label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(roles.data?.roles ?? []).map((item) => (
              <tr key={item.role}>
                <td>
                  <b>{item.label}</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {item.description}
                  </div>
                </td>
                {permissionLabels.map(([key]) => (
                  <td key={key}>
                    <span className={item.permissions[key] ? "perm-yes" : "perm-no"}>
                      {item.permissions[key] ? "Sí" : "No"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      <div className="panel">
        <div className="panel-head">
          <b>Asignar rol</b>
        </div>
        {professionals.loading && !professionals.data ? (
          <TableSkeleton columns={3} rows={5} />
        ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Institución</th>
              <th>Rol actual</th>
            </tr>
          </thead>
          <tbody>
            {(professionals.data?.professionals ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.institution}</td>
                <td>
                  <select
                    value={item.role}
                    disabled={item.userId === session?.userId || busyId === item.id}
                    onChange={(e) => changeRole(item.id, e.target.value as Role)}
                  >
                    {(Object.keys(roleLabel) as Role[]).map((role) => (
                      <option key={role} value={role}>
                        {roleLabel[role]}
                      </option>
                    ))}
                  </select>
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
