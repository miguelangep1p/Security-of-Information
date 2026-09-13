"use client";

import { Check, Clock, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useSession } from "@/lib/client/session";
import { roleLabel } from "@/lib/nav";

// Se muestra en toda la app cuando la sesión existe pero el membership sigue Pendiente o Suspendido:
// el registro ya creó la cuenta (por eso hay sesión), pero la institución todavía no la habilita.
export function PendingAccount() {
  const { session, logout } = useSession();
  if (!session) return null;
  const suspended = session.membershipStatus === "Suspendido";

  return (
    <div className="onboard">
      <aside className="onboard-side">
        <Logo />
        <p style={{ marginTop: "auto", fontSize: 12, color: "#9db5b0" }}>
          Registro protegido · Datos de demostración
        </p>
      </aside>
      <main className="onboard-main">
        <section className="form-card">
          <div className="passkey-icon">
            <Clock size={35} />
          </div>
          <div className="eyebrow">{suspended ? "Cuenta suspendida" : "Solicitud en revisión"}</div>
          <h1>{suspended ? "Tu acceso está suspendido" : `Hola, ${session.shortName}`}</h1>
          <p>
            {suspended
              ? "La institución suspendió tu vínculo. Contacta a un administrador para restablecerlo."
              : "Tu identidad y tu correo ya quedaron verificados. La institución debe habilitar tu vínculo antes de que puedas ver información clínica."}
          </p>
          <div className="result-card">
            <div className="result-grid">
              <div>
                <span>Profesional</span>
                <b>{session.name}</b>
              </div>
              <div>
                <span>Institución</span>
                <b>{session.institution}</b>
              </div>
              <div>
                <span>Rol solicitado</span>
                <b>{roleLabel[session.role]}</b>
              </div>
              <div>
                <span>Estado</span>
                <b style={{ color: suspended ? "var(--red)" : "#a06c1c" }}>{session.membershipStatus}</b>
              </div>
            </div>
          </div>
          {!suspended && (
            <div className="verified">
              <Check size={18} /> Passkey y correo institucional listos para cuando te habiliten.
            </div>
          )}
          <button className="btn secondary" style={{ width: "100%", marginTop: 20 }} onClick={() => logout()}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </section>
      </main>
    </div>
  );
}
