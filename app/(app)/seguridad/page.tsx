"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { actionLabel, authMethodLabel, describeDevice, formatWhen } from "@/lib/format";
import type { SecurityOverview } from "@/lib/types";

export default function SeguridadPage() {
  const { session } = useSession();
  const overview = useApi<SecurityOverview>("/api/me/seguridad");
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!session) return null;

  const sessions = overview.data?.sessions ?? [];
  const passkeys = overview.data?.passkeys ?? [];
  const current = sessions.find((item) => item.current);
  const others = sessions.length - (current ? 1 : 0);

  const closeOthers = async () => {
    setRevoking(true);
    setError(null);
    try {
      await api("/api/me/sesiones", { method: "DELETE" });
      overview.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Seguridad de mi cuenta</h1>
          <p className="muted">Tus dispositivos, sesiones y actividad reciente.</p>
        </div>
      </div>
      <ErrorNote message={overview.error ?? error} />
      <div className="review-layout">
        <div className="panel">
          <div className="panel-head">
            <b>Passkey</b>
            <span className={`badge ${passkeys.length ? "ok" : "warn"}`}>
              {passkeys.length ? "Configurada" : "Sin registrar"}
            </span>
          </div>
          <div className="transcription">
            {passkeys.map((passkey) => (
              <div className="listrow" key={passkey.id}>
                <div>
                  <b>{passkey.deviceLabel}</b>
                  <div className="muted">Último uso: {formatWhen(passkey.lastUsedAt)}</div>
                </div>
                <span className="badge ok">Confiable</span>
              </div>
            ))}
            {!overview.loading && passkeys.length === 0 && (
              <div className="listrow">
                <div>
                  <b>Sin passkeys registradas</b>
                  <div className="muted">En esta demo la Passkey es simulada.</div>
                </div>
              </div>
            )}
            {current && (
              <>
                <div className="listrow">
                  <div>
                    <b>Esta sesión</b>
                    <div className="muted">
                      {describeDevice(current.userAgent)} · {authMethodLabel[current.authMethod] ?? current.authMethod}
                    </div>
                  </div>
                  <span className="muted">{formatWhen(current.createdAt)}</span>
                </div>
                <div className="listrow">
                  <div>
                    <b>Dirección IP</b>
                    <div className="muted">{current.ip ?? "No disponible"}</div>
                  </div>
                </div>
              </>
            )}
            <div className="listrow">
              <div>
                <b>Sesiones activas</b>
                <div className="muted">
                  {others === 0 ? "Solo esta sesión" : others === 1 ? "1 sesión adicional" : `${others} sesiones adicionales`}
                </div>
              </div>
              <button
                className="btn secondary"
                onClick={closeOthers}
                disabled={others === 0 || revoking}
              >
                Cerrar otras sesiones
              </button>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <b>Actividad reciente</b>
          </div>
          <div className="transcription">
            {(overview.data?.activity ?? []).map((item) => (
              <div className="listrow" key={item.id}>
                <span>
                  {actionLabel[item.action] ?? item.action} · {item.resource}
                </span>
                <span className="muted">{formatWhen(item.occurredAt)}</span>
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12 }}>
              Cuenta: {session.email}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
