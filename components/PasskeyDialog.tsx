"use client";

import { Check, Fingerprint, ShieldCheck, X } from "lucide-react";

export type PasskeyPhase = "closed" | "intro" | "checking" | "success";

export function PasskeyDialog({
  phase,
  onClose,
  onContinue,
  onDone,
  title = "Crear una passkey",
  subtitle = "Usaremos Windows Hello para proteger esta cuenta en tu dispositivo.",
}: {
  phase: PasskeyPhase;
  onClose: () => void;
  onContinue: () => void;
  onDone: () => void;
  title?: string;
  subtitle?: string;
}) {
  if (phase === "closed") return null;

  return (
    <div className="modal-back">
      <div className="modal device-dialog pop-in">
        {phase === "intro" && (
          <>
            <div className="device-top">
              <span>Seguridad de Windows</span>
              <button aria-label="Cerrar" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
            <div className="passkey-icon">
              <Fingerprint size={36} />
            </div>
            <h2>{title}</h2>
            <p className="muted">{subtitle}</p>
            <div className="privacy-note">
              <ShieldCheck size={20} />
              <span>
                <b>Tu biometría no se comparte</b>
                <small>Nexo Clínico solo recibe una confirmación segura.</small>
              </span>
            </div>
            <button
              className="btn primary"
              style={{ width: "100%" }}
              onClick={onContinue}
            >
              Continuar con Windows Hello
            </button>
            <button className="btn ghost" style={{ width: "100%" }} onClick={onClose}>
              Ahora no
            </button>
          </>
        )}
        {phase === "checking" && (
          <div className="device-checking" aria-live="polite">
            <div className="scan-rings">
              <span>
                <Fingerprint size={38} />
              </span>
            </div>
            <h2>Confirma en tu dispositivo</h2>
            <p className="muted">Verificando Windows Hello de forma segura…</p>
            <div className="progress-track">
              <i />
            </div>
          </div>
        )}
        {phase === "success" && (
          <div className="device-checking pop-in" aria-live="polite">
            <div className="success-orbit">
              <Check size={34} />
            </div>
            <h2>Identidad confirmada</h2>
            <p className="muted">Windows Hello se usó como dispositivo confiable.</p>
            <button className="btn primary" style={{ width: "100%" }} onClick={onDone}>
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
