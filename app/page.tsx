"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, Lock, LogIn } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="landing">
      <nav>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn ghost"
            style={{ fontWeight: 600 }}
            onClick={() => router.push("/login")}
          >
            <LogIn size={17} /> Iniciar sesión
          </button>
          <button
            className="btn primary"
            style={{ minHeight: 40, fontSize: 13.5 }}
            onClick={() => router.push("/registro")}
          >
            Registrar profesional
          </button>
        </div>
      </nav>

      <main className="hero" style={{ paddingBottom: 60 }}>
        <section>
          <div className="eyebrow">Documentación clínica protegida</div>
          <h1>Digitalización clínica segura, validada por profesionales.</h1>
          <p>
            La IA agiliza la transcripción. Tú conservas la decisión clínica, con
            controles de seguridad y firma biométrica FIDO2.
          </p>

          <div className="hero-actions">
            <button
              className="btn primary"
              onClick={() => router.push("/registro")}
            >
              Registrar profesional <ArrowRight size={18} />
            </button>
            <button
              className="btn secondary"
              onClick={() => router.push("/login")}
            >
              <LogIn size={17} /> Probar inicio de sesión
            </button>
          </div>

          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 24 }}>
            <Lock size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Prototipo interactivo con datos ficticios · Sin información clínica real
          </p>
        </section>

        {/* Panel Hero: Imagen del Equipo Clínico */}
        <div className="hero-visual-card">
          <div className="hero-photo-wrap">
            <img
              src="/images/hero-clinical.jpg"
              alt="Equipo médico en consulta utilizando Nexo Clínico"
              className="hero-photo"
            />
            <div className="hero-photo-badge">
              <BadgeCheck size={14} color="#5bb8a8" />
              <span>Consultorio 102 · Hospital Regional Demo</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
