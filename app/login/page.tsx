"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  FileCheck2,
  Fingerprint,
  Lock,
  Mail,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { PasskeyDialog, type PasskeyPhase } from "@/components/PasskeyDialog";
import { homePath } from "@/lib/access";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { roleLabel } from "@/lib/nav";
import type { Role, Session, User } from "@/lib/types";

type TabMode = "demo" | "credentials";

const roleIcons: Record<Role, React.ComponentType<{ size?: number }>> = {
  MÉDICO: Stethoscope,
  ADMIN: ShieldCheck,
  AUDITOR: FileCheck2,
  DIGITALIZADOR: ScanLine,
};

const roleBadgeClasses: Record<Role, string> = {
  MÉDICO: "badge-role-medico",
  ADMIN: "badge-role-admin",
  AUDITOR: "badge-role-auditor",
  DIGITALIZADOR: "badge-role-digitalizador",
};

const roleAvatarColors: Record<Role, { bg: string; color: string }> = {
  MÉDICO: { bg: "#dcf0e8", color: "#0c7364" },
  ADMIN: { bg: "#e0e7ff", color: "#3730a3" },
  AUDITOR: { bg: "#fef3c7", color: "#92400e" },
  DIGITALIZADOR: { bg: "#cffafe", color: "#0e7490" },
};

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useSession();
  // Responde 404 cuando el modo demostración está apagado: en ese caso se ocultan perfiles y Passkey simulada.
  const demo = useApi<{ users: User[] }>("/api/auth/demo");
  const users = demo.data?.users ?? [];
  const demoAvailable = demo.data !== null;

  const [activeTab, setActiveTab] = useState<TabMode>("credentials");
  const [showAutofill, setShowAutofill] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<{ email: string; label: string } | null>(null);
  const [phase, setPhase] = useState<PasskeyPhase>("closed");

  // Credentials tab state
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<"passkey" | "email">("passkey");
  const [emailError, setEmailError] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredUsers =
    selectedRoleFilter === "ALL"
      ? users
      : users.filter((u) => u.role === selectedRoleFilter);

  const finishLogin = (session: Session) => {
    setSession(session);
    router.replace(homePath(session.role));
  };

  const enterDemo = async (userEmail: string) => {
    setEmailError("");
    try {
      const { session } = await api<{ session: Session }>("/api/auth/demo", { body: { email: userEmail } });
      finishLogin(session);
    } catch (error) {
      setPhase("closed");
      setEmailError((error as Error).message);
    }
  };

  const startPasskey = (user: User) => {
    setSelected({ email: user.email, label: `${user.name} (${roleLabel[user.role]})` });
    setPhase("intro");
  };

  const resetCode = () => {
    setCodeSent(false);
    setDevCode(null);
    setCode("");
  };

  const handleAutofill = (user: User) => {
    setEmail(user.email);
    resetCode();
    setEmailError("");
  };

  const handleCredentialLogin = async () => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailError("Ingresa un correo institucional válido.");
      return;
    }

    if (authMethod === "passkey") {
      if (!demoAvailable) {
        setEmailError("La Passkey simulada solo está disponible en modo demostración. Usa el código por correo.");
        return;
      }
      const match = users.find((u) => u.email === normalized);
      setSelected({ email: normalized, label: match ? `${match.name} (${roleLabel[match.role]})` : normalized });
      setPhase("intro");
      return;
    }

    setBusy(true);
    setEmailError("");
    try {
      if (!codeSent) {
        const result = await api<{ devCode: string | null }>("/api/auth/codigo", { body: { email: normalized } });
        setCodeSent(true);
        setDevCode(result.devCode);
      } else {
        const { session } = await api<{ session: Session }>("/api/auth/login", {
          body: { email: normalized, code },
        });
        finishLogin(session);
      }
    } catch (error) {
      setEmailError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-split">
      {/* Panel Izquierdo: Contexto Institucional y Seguridad */}
      <aside className="login-aside">
        <div className="aside-content">
          <div style={{ marginBottom: 40 }}>
            <Logo />
          </div>

          <div className="aside-badge">
            <ShieldCheck size={15} />
            <span>Portal de Acceso Clínico Hospitalario</span>
          </div>

          <h2 className="aside-title">
            Digitalización clínica con seguridad institucional.
          </h2>
          <p className="aside-desc">
            Autenticación robusta basada en roles, biometría FIDO2 sin contraseñas
            y trazabilidad inmutable en cada registro asistido.
          </p>

          <div className="aside-features">
            <div className="aside-feature-item">
              <div className="aside-feature-icon">
                <Fingerprint size={18} />
              </div>
              <div className="aside-feature-text">
                <b>Acceso Biométrico Passkey</b>
                <span>
                  Sin contraseñas vulnerables a phishing. Verificado por el dispositivo.
                </span>
              </div>
            </div>

            <div className="aside-feature-item">
              <div className="aside-feature-icon">
                <BadgeCheck size={18} />
              </div>
              <div className="aside-feature-text">
                <b>Validación Colegiada CMP</b>
                <span>
                  Control de habilidades médicas antes de autorizar acceso a fichas clínicas.
                </span>
              </div>
            </div>

            <div className="aside-feature-item">
              <div className="aside-feature-icon">
                <Lock size={18} />
              </div>
              <div className="aside-feature-text">
                <b>Control de Accesos por Rol (RBAC)</b>
                <span>
                  Permisos granulares para médicos, digitalizadores y auditores de salud.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cita / Preview de auditoría */}
        <div>
          <div className="aside-quote">
            <div className="aside-quote-header">
              <span>AUDITORÍA EN TIEMPO REAL</span>
              <span style={{ color: "#92e0d3" }}>RENIEC · MINSA</span>
            </div>
            <p className="aside-quote-text">
              “Cada intervención de IA es una propuesta que el médico tratante
              valida y sella con su firma digital.”
            </p>
          </div>

          <div className="aside-doctor-card">
            <img
              src="/images/doctor-login.jpg"
              alt="Personal médico institucional"
              className="aside-doctor-thumb"
            />
            <div>
              <b style={{ color: "#fff", fontSize: 13.5, display: "block" }}>
                Cuerpo Médico Institucional
              </b>
              <span style={{ color: "#92e0d3", fontSize: 12 }}>
                Medicina Interna
              </span>
              <small
                style={{
                  color: "#a7c5be",
                  display: "block",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Hospital Regional Demo · Trujillo
              </small>
            </div>
          </div>
        </div>
      </aside>

      {/* Panel Derecho: Portal de Acceso */}
      <main className="login-main">
        <div className="login-top-nav">
          <button className="btn ghost" onClick={() => router.push("/")}>
            <ArrowLeft size={16} /> Volver a la portada
          </button>
        </div>

        <div className="login-wrapper">
          {activeTab === "credentials" ? (
            <div className="login-header">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--teal)",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <ShieldCheck size={15} /> Acceso institucional
              </div>
              <h1>Iniciar sesión</h1>
              <p>
                Ingresa con tu correo institucional. Verificamos tu identidad con
                Passkey biométrico o un código de acceso de un solo uso.
              </p>
            </div>
          ) : (
            <div className="login-header">
              <button
                type="button"
                className="btn ghost"
                style={{ padding: "6px 10px", marginBottom: 14, fontSize: 13 }}
                onClick={() => setActiveTab("credentials")}
              >
                <ArrowLeft size={15} /> Volver a inicio de sesión institucional
              </button>
              <h1>Perfiles de demostración</h1>
              <p>
                Selecciona un perfil de prueba para explorar la plataforma sin
                credenciales reales.
              </p>
            </div>
          )}

          {/* MODO 1: Perfiles de Demostración */}
          {activeTab === "demo" && (
            <div>
              {/* Filtros por Rol */}
              <div className="role-filters">
                {[
                  { id: "ALL", label: `Todos (${users.length})` },
                  { id: "MÉDICO", label: "Médicos" },
                  { id: "ADMIN", label: "Administración" },
                  { id: "AUDITOR", label: "Auditoría" },
                  { id: "DIGITALIZADOR", label: "Digitalización" },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={`role-chip ${selectedRoleFilter === f.id ? "active" : ""}`}
                    onClick={() => setSelectedRoleFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {emailError && (
                <p style={{ color: "var(--red)", fontSize: 12.5, margin: "10px 0" }} role="alert">
                  {emailError}
                </p>
              )}

              {/* Grid de Personas de Prueba */}
              <div className="persona-grid">
                {demo.loading && <p className="muted">Cargando perfiles…</p>}
                {filteredUsers.map((user) => {
                  const RoleIcon = roleIcons[user.role];
                  const avatarColor = roleAvatarColors[user.role];
                  const badgeClass = roleBadgeClasses[user.role];

                  return (
                    <div className="persona-card" key={user.id}>
                      <div>
                        <div className="persona-header">
                          <div
                            className="persona-avatar"
                            style={{
                              background: avatarColor.bg,
                              color: avatarColor.color,
                            }}
                          >
                            {user.initials}
                          </div>
                          <div className="persona-info">
                            <div className="persona-name">{user.name}</div>
                            <span
                              className={`persona-role-badge ${badgeClass}`}
                            >
                              <RoleIcon size={12} />
                              <span>{roleLabel[user.role]}</span>
                            </span>
                          </div>
                        </div>

                        <div className="persona-meta">
                          <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                            {user.institution}
                          </span>
                          <span>
                            {user.specialty
                              ? `${user.specialty} · CMP ${user.cmp}`
                              : user.cmp
                              ? `CMP ${user.cmp}`
                              : "Gestión institucional"}
                          </span>
                        </div>
                      </div>

                      <div className="persona-actions">
                        <button
                          className="btn-direct"
                          onClick={() => enterDemo(user.email)}
                          title={`Ingresar inmediatamente como ${user.shortName}`}
                        >
                          Entrar directo <ArrowRight size={14} />
                        </button>
                        <button
                          className="btn-passkey-mini"
                          onClick={() => startPasskey(user)}
                          title="Simular autenticación biométrica Passkey"
                        >
                          <Fingerprint size={15} /> Passkey
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "#f4f8f6",
                  borderRadius: 12,
                  fontSize: 12.5,
                  color: "var(--muted)",
                }}
              >
                <span>
                  💡 <b>Tip de evaluación:</b> Puedes ingresar con un clic o probar la simulación biométrica FIDO2.
                </span>
                <span
                  style={{
                    color: "var(--teal)",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Check size={14} /> Datos en Neon
                </span>
              </div>
            </div>
          )}

          {/* MODO 2: Credenciales Institucionales */}
          {activeTab === "credentials" && (
            <div className="cred-card">
              {/* Sección de Autocompletado Rápido (solo en modo demostración) */}
              {demoAvailable &&
                (showAutofill ? (
                  <div className="autofill-section">
                    <div className="autofill-label">
                      <Sparkles size={14} /> Autocompletar con usuario de prueba:
                    </div>
                    <div className="autofill-buttons">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="btn-autofill"
                          onClick={() => handleAutofill(u)}
                        >
                          {u.shortName} ({roleLabel[u.role]})
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAutofill(true)}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "var(--muted)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      marginBottom: 20,
                      cursor: "pointer",
                    }}
                  >
                    <Sparkles size={13} /> ¿Solo quieres probar? Autocompletar con un usuario de prueba
                  </button>
                ))}

              {/* Selector de Método */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 20,
                  padding: 4,
                  background: "#f0f4f2",
                  borderRadius: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("passkey");
                    setEmailError("");
                  }}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    border: 0,
                    borderRadius: 8,
                    background: authMethod === "passkey" ? "#fff" : "transparent",
                    color: authMethod === "passkey" ? "var(--ink)" : "var(--muted)",
                    fontWeight: 650,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: authMethod === "passkey" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <Fingerprint size={16} color="var(--teal)" /> Passkey / Biometría
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("email");
                    setEmailError("");
                  }}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    border: 0,
                    borderRadius: 8,
                    background: authMethod === "email" ? "#fff" : "transparent",
                    color: authMethod === "email" ? "var(--ink)" : "var(--muted)",
                    fontWeight: 650,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: authMethod === "email" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <Mail size={16} color="var(--teal)" /> Código de Correo (OTP)
                </button>
              </div>

              <div className="field">
                <label>Correo Institucional</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      resetCode();
                      setEmailError("");
                    }}
                    placeholder="nombre@hospitaldemo.pe"
                    style={{ paddingLeft: 38 }}
                  />
                  <Mail
                    size={17}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted)",
                    }}
                  />
                </div>
              </div>

              {authMethod === "email" && codeSent && (
                <div className="field">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <label style={{ margin: 0 }}>Código de verificación</label>
                    <span style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>
                      {devCode ? (
                        <>
                          Código (modo demo): <b>{devCode}</b>
                        </>
                      ) : (
                        "Si el correo está registrado, te enviamos un código."
                      )}
                    </span>
                  </div>
                  <input
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    style={{
                      fontSize: 18,
                      letterSpacing: "0.2em",
                      textAlign: "center",
                    }}
                  />
                </div>
              )}

              {emailError && (
                <p style={{ color: "var(--red)", fontSize: 12.5, margin: "10px 0" }} role="alert">
                  {emailError}
                </p>
              )}

              <button
                className="btn primary"
                style={{ width: "100%", marginTop: 8 }}
                onClick={handleCredentialLogin}
                disabled={busy || (authMethod === "email" && codeSent && code.length !== 6)}
              >
                {authMethod === "passkey" ? (
                  <>
                    <Fingerprint size={19} /> Continuar con Passkey
                  </>
                ) : codeSent ? (
                  <>
                    <ArrowRight size={19} /> Validar e ingresar
                  </>
                ) : (
                  <>
                    <Mail size={19} /> Enviar código
                  </>
                )}
              </button>

              <div
                style={{
                  marginTop: 18,
                  fontSize: 12,
                  color: "var(--muted)",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Lock size={13} /> Conexión institucional cifrada de extremo a extremo
              </div>
            </div>
          )}

          {activeTab === "credentials" && demoAvailable && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setEmailError("");
                  setActiveTab("demo");
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Users size={13} /> ¿Solo quieres explorar la plataforma? Usar un perfil de demostración
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Diálogo de Passkey FIDO2 / Windows Hello (simulado en modo demostración) */}
      <PasskeyDialog
        phase={phase}
        title="Confirmar identidad médica"
        subtitle={
          selected
            ? `Autenticando como ${selected.label}.`
            : "Autenticando mediante dispositivo biométrico confiable."
        }
        onClose={() => {
          setPhase("closed");
        }}
        onContinue={() => {
          setPhase("checking");
          setTimeout(() => setPhase("success"), 1100);
        }}
        onDone={() => {
          if (selected) enterDemo(selected.email);
        }}
      />
    </div>
  );
}
