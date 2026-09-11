"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  Fingerprint,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { PasskeyDialog, type PasskeyPhase } from "@/components/PasskeyDialog";
import { homePath } from "@/lib/access";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import type { Session } from "@/lib/types";

// Código de la verificación simulada de correo en este asistente.
const EMAIL_CODE = "246810";

export default function RegistroPage() {
  const router = useRouter();
  const { setSession } = useSession();
  const [step, setStep] = useState(1);
  const [dni, setDni] = useState("");
  const [dniState, setDniState] = useState<"idle" | "loading" | "ok" | "bad">("idle");
  const dniRequest = useRef(0);
  const [email, setEmail] = useState("c.mendoza@hospitaldemo.pe");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "verified">("idle");
  const [emailCode, setEmailCode] = useState("");
  const [cmp, setCmp] = useState("084521");
  const [cmpState, setCmpState] = useState<"idle" | "loading" | "ok" | "bad">("idle");
  const [manualReview, setManualReview] = useState(false);
  const [institution, setInstitution] = useState("Hospital Regional Demo");
  const [institutionState, setInstitutionState] = useState<"idle" | "checking" | "linked">("idle");
  const [pass, setPass] = useState<"idle" | "ok">("idle");
  const [passDialog, setPassDialog] = useState<PasskeyPhase>("closed");
  const next = () => setStep((s) => Math.min(5, s + 1));
  const genericDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"];
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !genericDomains.includes(emailDomain);

  // El registro sigue simulado (RENIEC, CMP y Passkey); al terminar entra con el perfil demo de Carlos.
  const finish = async () => {
    try {
      const { session } = await api<{ session: Session }>("/api/auth/demo", {
        body: { email: "c.mendoza@hospitaldemo.pe" },
      });
      setSession(session);
      router.replace(homePath(session.role));
    } catch {
      router.replace("/login");
    }
  };

  const sendEmailCode = () => {
    if (!emailValid || dniState !== "ok") return;
    setEmailState("sending");
    setTimeout(() => setEmailState("sent"), 750);
  };

  const handleDni = (value: string) => {
    const normalized = value.replace(/\D/g, "").slice(0, 8);
    setDni(normalized);
    setEmailState("idle");
    setEmailCode("");
    const request = ++dniRequest.current;
    if (normalized.length !== 8) {
      setDniState("idle");
      return;
    }
    setDniState("loading");
    setTimeout(() => {
      if (request !== dniRequest.current) return;
      setDniState(new Set(normalized).size === 1 ? "bad" : "ok");
    }, 850);
  };

  return (
    <div className="onboard">
      <aside className="onboard-side">
        <Logo />
        <div className="steps">
          {[
            "Identidad",
            "Verificación profesional",
            "Institución",
            "Seguridad",
            "Confirmación",
          ].map((x, i) => (
            <div
              className={`step ${step === i + 1 ? "current" : ""} ${step > i + 1 ? "done" : ""}`}
              key={x}
            >
              <b>{step > i + 1 ? <Check size={16} /> : i + 1}</b>
              <span>{x}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: "auto", fontSize: 12, color: "#9db5b0" }}>
          Registro protegido · Datos de demostración
        </p>
      </aside>
      <main className="onboard-main">
        <section className="form-card pulse" key={step}>
          {step === 1 && (
            <>
              <div className="eyebrow">Paso 1 de 5</div>
              <h1>Comencemos verificando tu identidad</h1>
              <p>Necesitamos información básica para crear tu perfil profesional.</p>
              <div className="field">
                <label>DNI</label>
                <input
                  value={dni}
                  onChange={(e) => handleDni(e.target.value)}
                  placeholder="Ej. 70245816"
                  maxLength={8}
                  inputMode="numeric"
                  aria-describedby="dni-help"
                />
                <div id="dni-help" className="muted" style={{ fontSize: 12, marginTop: 7 }}>
                  Completa los 8 dígitos para consultar. Prueba 00000000 para el caso inválido.
                </div>
              </div>
              {dniState === "loading" && (
                <div className="result-card" style={{ padding: 20 }} aria-live="polite">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="spinner" style={{ width: 26, height: 26, margin: 0 }} />
                    <b>Consultando datos de identidad…</b>
                  </div>
                </div>
              )}
              {dniState === "bad" && (
                <div
                  className="verified"
                  style={{ background: "#fff1ef", borderColor: "#f1ceca", color: "var(--red)" }}
                  role="alert"
                >
                  <X size={18} /> No pudimos encontrar datos para este DNI.
                </div>
              )}
              {dniState === "ok" && (
                <>
                  <div className="result-card">
                    <div className="result-head">
                      <Check size={18} /> Identidad encontrada
                      <span className="badge ok" style={{ marginLeft: "auto" }}>
                        RENIEC · Simulación
                      </span>
                    </div>
                    <div className="result-grid">
                      <div>
                        <span>Nombres</span>
                        <b>Carlos</b>
                      </div>
                      <div>
                        <span>Apellido paterno</span>
                        <b>Mendoza</b>
                      </div>
                      <div>
                        <span>Apellido materno</span>
                        <b>Salazar</b>
                      </div>
                      <div>
                        <span>Documento</span>
                        <b>DNI {dni}</b>
                      </div>
                    </div>
                  </div>
                  <div className="verified">
                    <Check size={18} /> Datos de identidad verificados y no editables
                  </div>
                </>
              )}
              <div className="field">
                <label>Correo institucional</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailState("idle");
                    setEmailCode("");
                  }}
                  disabled={emailState === "verified"}
                />
                {email.length > 0 && !emailValid && (
                  <div style={{ color: "var(--red)", fontSize: 12, marginTop: 7 }} role="alert">
                    Usa un correo de tu institución; no se admiten dominios personales.
                  </div>
                )}
              </div>
              {emailState === "idle" && (
                <button
                  className="btn secondary"
                  style={{ width: "100%", marginBottom: 16 }}
                  disabled={!emailValid || dniState !== "ok"}
                  onClick={sendEmailCode}
                >
                  Verificar correo institucional
                </button>
              )}
              {emailState === "sending" && (
                <div className="verified">
                  <div className="spinner" style={{ width: 22, height: 22, margin: 0 }} />
                  Enviando correo de verificación…
                </div>
              )}
              {emailState === "sent" && (
                <div className="result-card" style={{ padding: 20 }}>
                  <b>Revisa tu correo</b>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Enviamos un código simulado a {email}. Usa <b>{EMAIL_CODE}</b>.
                  </p>
                  <div className="field">
                    <label>Código de 6 dígitos</label>
                    <input
                      value={emailCode}
                      onChange={(e) =>
                        setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </div>
                  {emailCode.length === 6 && emailCode !== EMAIL_CODE && (
                    <p style={{ color: "var(--red)", fontSize: 12 }} role="alert">
                      El código no es válido.
                    </p>
                  )}
                  <button
                    className="btn primary"
                    disabled={emailCode !== EMAIL_CODE}
                    onClick={() => setEmailState("verified")}
                  >
                    Confirmar código
                  </button>
                </div>
              )}
              {emailState === "verified" && (
                <div className="verified">
                  <Check size={18} /> Correo institucional verificado
                </div>
              )}
              <button
                className="btn primary"
                disabled={dniState !== "ok" || emailState !== "verified"}
                style={{
                  width: "100%",
                  opacity: dniState === "ok" && emailState === "verified" ? 1 : 0.45,
                }}
                onClick={next}
              >
                Continuar
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <div className="eyebrow">Paso 2 de 5</div>
              <h1>Verifica tu registro profesional</h1>
              <p>Ingresa tu número de colegiatura. Esta consulta es una simulación CMP.</p>
              <div className="field">
                <label>Número CMP</label>
                <input
                  value={cmp}
                  onChange={(e) => {
                    setCmp(e.target.value);
                    setCmpState("idle");
                    setManualReview(false);
                  }}
                  style={{ fontSize: 23, letterSpacing: ".12em" }}
                />
              </div>
              {cmpState === "idle" && !manualReview && (
                <button
                  className="btn primary"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setCmpState("loading");
                    setTimeout(() => setCmpState(cmp === "000000" ? "bad" : "ok"), 900);
                  }}
                >
                  Verificar CMP
                </button>
              )}
              {cmpState === "loading" && (
                <div className="result-card" style={{ padding: 25 }}>
                  <div className="mini-line" />
                  <div className="mini-line" style={{ width: "70%" }} />
                </div>
              )}
              {cmpState === "bad" && !manualReview && (
                <div className="result-card">
                  <div className="result-head" style={{ background: "#fff1ef", color: "var(--red)" }}>
                    <X size={18} /> No pudimos verificar este CMP.
                  </div>
                  <div style={{ padding: 20 }}>
                    <p className="muted">
                      Revisa el número o solicita una validación por parte de la institución.
                    </p>
                    <button className="btn secondary" onClick={() => setCmpState("idle")}>
                      Intentar nuevamente
                    </button>{" "}
                    <button className="btn ghost" onClick={() => setManualReview(true)}>
                      Solicitar revisión manual
                    </button>
                  </div>
                </div>
              )}
              {manualReview && (
                <div className="success-panel pop-in">
                  <span className="success-check">
                    <Check size={22} />
                  </span>
                  <div>
                    <b>Solicitud enviada</b>
                    <p>La institución revisará el CMP antes de habilitar el acceso clínico.</p>
                  </div>
                  <button className="btn primary" onClick={next}>
                    Continuar
                  </button>
                  <button className="btn ghost" onClick={() => router.push("/")}>
                    Volver al inicio
                  </button>
                </div>
              )}
              {cmpState === "ok" && (
                <>
                  <div className="result-card">
                    <div className="result-head">
                      <Check size={18} /> Profesional encontrado
                      <span className="badge ok" style={{ marginLeft: "auto" }}>
                        Datos verificados
                      </span>
                    </div>
                    <div className="result-grid">
                      <div>
                        <span>Nombre</span>
                        <b>Dr. Carlos Mendoza Salazar</b>
                      </div>
                      <div>
                        <span>CMP</span>
                        <b>{cmp}</b>
                      </div>
                      <div>
                        <span>Estado</span>
                        <b style={{ color: "var(--green)" }}>HÁBIL</b>
                      </div>
                      <div>
                        <span>Consejo regional</span>
                        <b>La Libertad</b>
                      </div>
                    </div>
                  </div>
                  <button className="btn primary" style={{ width: "100%" }} onClick={next}>
                    Confirmar que soy yo
                  </button>
                </>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <div className="eyebrow">Paso 3 de 5</div>
              <h1>¿Dónde ejerces actualmente?</h1>
              <p>Tu institución validará este vínculo antes de habilitar accesos clínicos.</p>
              {[
                ["Hospital Regional Demo", "Hospital público", "Trujillo"],
                ["Clínica Demo Norte", "Clínica privada", "Víctor Larco"],
                ["Centro Médico Demo", "Centro ambulatorio", "La Esperanza"],
              ].map(([name, type, city]) => (
                <button
                  type="button"
                  className={`institution institution-rich ${institution === name ? "selected" : ""}`}
                  key={name}
                  onClick={() => {
                    setInstitution(name);
                    setInstitutionState("idle");
                  }}
                >
                  <span className="institution-logo">
                    <Building2 size={22} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <b>{name}</b>
                    <small>
                      {type} · <MapPin size={12} /> {city}
                    </small>
                  </span>
                  <span className={`selection-dot ${institution === name ? "checked" : ""}`}>
                    {institution === name && <Check size={14} />}
                  </span>
                </button>
              ))}
              <div
                className="verified"
                style={{ background: "#fff7e7", borderColor: "#f1ddb4", color: "#745315" }}
              >
                <AlertTriangle size={18} /> Un CMP válido no habilita automáticamente el acceso clínico.
              </div>
              {institutionState === "idle" && (
                <button
                  className="btn primary"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setInstitutionState("checking");
                    setTimeout(() => setInstitutionState("linked"), 1000);
                  }}
                >
                  Validar vínculo institucional <ArrowRight size={18} />
                </button>
              )}
              {institutionState === "checking" && (
                <div className="status-progress">
                  <div className="spinner" style={{ width: 28, height: 28, margin: 0 }} />
                  <div>
                    <b>Registrando tu vínculo…</b>
                    <small>Comprobando institución, servicio y cargo</small>
                  </div>
                </div>
              )}
              {institutionState === "linked" && (
                <div className="success-panel pop-in">
                  <span className="success-check">
                    <Check size={22} />
                  </span>
                  <div>
                    <b>Vínculo institucional registrado</b>
                    <p>{institution} revisará la solicitud antes de habilitar datos clínicos.</p>
                  </div>
                  <button className="btn primary" onClick={next}>
                    Continuar
                  </button>
                </div>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <div className="eyebrow">Paso 4 de 5</div>
              <h1>Protege tu cuenta</h1>
              <p>
                Utiliza la seguridad de tu dispositivo para confirmar tu identidad sin
                introducir códigos constantemente.
              </p>
              <div className="passkey-card">
                <div className="passkey-icon">
                  {pass === "ok" ? <Check size={35} /> : <Fingerprint size={35} />}
                </div>
                <h2>Passkey</h2>
                {pass === "idle" && (
                  <>
                    <p className="muted">
                      Confirma acciones sensibles con la seguridad que ya usas para
                      desbloquear tu equipo.
                    </p>
                    <div className="passkey-benefits">
                      <span>
                        <Smartphone size={17} /> Este dispositivo
                      </span>
                      <span>
                        <Fingerprint size={17} /> Windows Hello
                      </span>
                      <span>
                        <ShieldCheck size={17} /> Sin contraseñas
                      </span>
                    </div>
                    <button className="btn primary" onClick={() => setPassDialog("intro")}>
                      Configurar Passkey
                    </button>
                  </>
                )}
                {pass === "ok" && (
                  <>
                    <div className="verified" style={{ justifyContent: "center" }}>
                      <Check size={18} /> Passkey configurada
                    </div>
                    <button className="btn primary" onClick={next}>
                      Continuar
                    </button>
                  </>
                )}
              </div>
              <p style={{ fontSize: 13, textAlign: "center" }}>
                <LockKeyhole size={14} style={{ display: "inline", marginRight: 5 }} />
                Tu información biométrica permanece en tu dispositivo.
              </p>
              <PasskeyDialog
                phase={passDialog}
                onClose={() => setPassDialog("closed")}
                onContinue={() => {
                  setPassDialog("checking");
                  setTimeout(() => setPassDialog("success"), 1500);
                }}
                onDone={() => {
                  setPass("ok");
                  setPassDialog("closed");
                }}
              />
            </>
          )}
          {step === 5 && (
            <>
              <div style={{ textAlign: "center" }}>
                <div className="passkey-icon">
                  <Check size={38} />
                </div>
                <div className="eyebrow">Registro completado</div>
                <h1>Todo está listo, Carlos</h1>
                <p>Tu identidad profesional y dispositivo quedaron verificados.</p>
              </div>
              <div className="result-card">
                <div className="result-grid">
                  <div>
                    <span>Profesional</span>
                    <b>Carlos Mendoza Salazar</b>
                  </div>
                  <div>
                    <span>CMP</span>
                    <b>{cmp === "000000" ? "Pendiente" : cmp}</b>
                  </div>
                  <div>
                    <span>Especialidad</span>
                    <b>Medicina Interna</b>
                  </div>
                  <div>
                    <span>Institución</span>
                    <b>{institution}</b>
                  </div>
                </div>
              </div>
              {[
                "Identidad verificada",
                manualReview ? "CMP en revisión manual" : "CMP verificado",
                "Institución confirmada",
                "Passkey configurada",
              ].map((x) => (
                <div className="listrow" key={x}>
                  <span>{x}</span>
                  <Check size={18} color="var(--green)" />
                </div>
              ))}
              <button
                className="btn primary"
                style={{ width: "100%", marginTop: 24 }}
                onClick={finish}
              >
                Entrar al sistema <ArrowRight size={18} />
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
