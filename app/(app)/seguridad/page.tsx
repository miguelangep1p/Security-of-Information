"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { api, useApi } from "@/lib/client/api";
import { registerPasskey } from "@/lib/client/passkeys";
import { useSession } from "@/lib/client/session";
import { actionLabel, authMethodLabel, describeDevice, formatWhen } from "@/lib/format";
import type { SecurityOverview } from "@/lib/types";

export default function SeguridadPage() {
  const { session } = useSession();
  const overview = useApi<SecurityOverview>("/api/me/seguridad");
  const [busy, setBusy] = useState<"revoke" | "passkey" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!session) return null;

  const sessions = overview.data?.sessions ?? [];
  const passkeys = overview.data?.passkeys ?? [];
  const current = sessions.find((item) => item.current);
  const others = sessions.length - (current ? 1 : 0);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      overview.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
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
                  <div className="muted">
                    Registrada {formatWhen(passkey.createdAt)} · Último uso: {formatWhen(passkey.lastUsedAt)}
                  </div>
                </div>
                <button
                  className="btn ghost"
                  disabled={busy !== null}
                  onClick={() => run(passkey.id, () => api(`/api/passkeys/${passkey.id}`, { method: "DELETE" }))}
                >
                  Eliminar
                </button>
              </div>
            ))}
            {!overview.loading && passkeys.length === 0 && (
              <div className="listrow">
                <div>
                  <b>Sin passkeys registradas</b>
                  <div className="muted">Regístrala para entrar con Touch ID, Windows Hello o tu teléfono.</div>
                </div>
              </div>
            )}
            <button
              className="btn primary"
              disabled={busy !== null}
              onClick={() => run("passkey", registerPasskey)}
            >
              <Fingerprint size={18} /> {busy === "passkey" ? "Esperando al dispositivo…" : "Registrar passkey en este dispositivo"}
            </button>
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
                onClick={() => run("revoke", () => api("/api/me/sesiones", { method: "DELETE" }))}
                disabled={others === 0 || busy !== null}
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
