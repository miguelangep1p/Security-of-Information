"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
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
import { ErrorNote } from "@/components/ErrorNote";
import { Logo } from "@/components/Logo";
import { homePath } from "@/lib/access";
import { api, useApi } from "@/lib/client/api";
import { registerPasskey } from "@/lib/client/passkeys";
import { useSession } from "@/lib/client/session";
import type { Institution, Session } from "@/lib/types";

type DniState = "idle" | "loading" | "ok" | "bad" | "taken" | "error";
type Identity = { nombres: string; apellidoPaterno: string; apellidoMaterno: string };
type DniResult = {
  status: "encontrado" | "no_encontrado" | "ya_registrado";
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
};

export default function RegistroPage() {
  const router = useRouter();
  const { setSession } = useSession();
  const [step, setStep] = useState(1);

  // Paso 1 — identidad (consulta real de DNI vía PeruDevs, resuelta en el servidor) y correo institucional real.
  const [dni, setDni] = useState("");
  const [dniState, setDniState] = useState<DniState>("idle");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const dniRequest = useRef(0);

  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "verified">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const genericDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"];
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const emailFormatValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !genericDomains.includes(emailDomain);

  // Paso 2 — número CMP (simulación del Colegio Médico; se revalida en el servidor al enviar el registro).
  const [cmp, setCmp] = useState("");
  const [cmpState, setCmpState] = useState<"idle" | "loading" | "ok" | "bad">("idle");
  const [manualReview, setManualReview] = useState(false);

  // Paso 3 — institución real (Neon) y creación efectiva de la cuenta (Pendiente de aprobación).
  const institutions = useApi<{ institutions: Institution[] }>(step >= 3 ? "/api/registro/instituciones" : null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionState, setInstitutionState] = useState<"idle" | "checking" | "linked">("idle");
  const [institutionError, setInstitutionError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<Session | null>(null);

  // Paso 4 — Passkey real (WebAuthn); ya hay sesión (Pendiente) para poder registrarla.
  const [pass, setPass] = useState<"idle" | "ok">("idle");
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(5, s + 1));

  const queryDni = (normalized: string) => {
    const request = ++dniRequest.current;
    setDniState("loading");
    api<DniResult>("/api/registro/dni", { body: { dni: normalized } })
      .then((result) => {
        if (request !== dniRequest.current) return;
        if (result.status === "encontrado") {
          setIdentity({
            nombres: result.nombres!,
            apellidoPaterno: result.apellidoPaterno!,
            apellidoMaterno: result.apellidoMaterno!,
          });
          setDniState("ok");
        } else if (result.status === "ya_registrado") {
          setDniState("taken");
        } else {
          setDniState("bad");
        }
      })
      .catch(() => {
        // Un error de red o del servidor no significa que el DNI no exista: se distingue de "bad".
        if (request === dniRequest.current) setDniState("error");
      });
  };

  const handleDni = (value: string) => {
    const normalized = value.replace(/\D/g, "").slice(0, 8);
    setDni(normalized);
    setIdentity(null);
    setEmailState("idle");
    setEmailError(null);
    setEmailCode("");
    setTicket(null);
    dniRequest.current++;
    if (normalized.length !== 8) {
      setDniState("idle");
      return;
    }
    queryDni(normalized);
  };

  const handleEmail = (value: string) => {
    setEmail(value);
    setEmailState("idle");
    setEmailError(null);
    setEmailCode("");
    setCodeError(null);
    setDevCode(null);
    setTicket(null);
  };

  const sendEmailCode = async () => {
    if (!emailFormatValid || dniState !== "ok") return;
    setEmailState("sending");
    setEmailError(null);
    try {
      const result = await api<{ devCode: string | null }>("/api/registro/correo/codigo", { body: { email } });
      setDevCode(result.devCode);
      setEmailState("sent");
    } catch (error) {
      setEmailError((error as Error).message);
      setEmailState("idle");
    }
  };

  const confirmEmailCode = async () => {
    setCodeError(null);
    try {
      const result = await api<{ ticket: string }>("/api/registro/correo/verificar", {
        body: { email, code: emailCode },
      });
      setTicket(result.ticket);
      setEmailState("verified");
    } catch (error) {
      setCodeError((error as Error).message);
    }
  };

  const linkInstitution = async () => {
    if (!institutionId || !ticket) return;
    setInstitutionState("checking");
    setInstitutionError(null);
    try {
      const { session } = await api<{ session: Session }>("/api/registro", {
        body: { dni, email, ticket, cmp, manualReview, institutionId },
      });
      setSession(session);
      setCreatedSession(session);
      setInstitutionState("linked");
    } catch (error) {
      setInstitutionError((error as Error).message);
      setInstitutionState("idle");
    }
  };

  const setupPasskey = async () => {
    setPassBusy(true);
    setPassError(null);
    try {
      await registerPasskey();
      setPass("ok");
    } catch (error) {
      setPassError((error as Error).message);
    } finally {
      setPassBusy(false);
    }
  };

  const finish = () => {
    router.replace(createdSession ? homePath(createdSession.role) : "/login");
  };

  const fullName = identity ? `${identity.nombres} ${identity.apellidoPaterno} ${identity.apellidoMaterno}` : "";
  const selectedInstitution = institutions.data?.institutions.find((i) => i.id === institutionId) ?? null;

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
        <div className="onboard-top-nav">
          <button type="button" className="btn ghost" onClick={() => router.push("/")}>
            <ArrowLeft size={16} /> Volver al inicio
          </button>
        </div>
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
                  Completa los 8 dígitos para consultar tu identidad en RENIEC.
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
              {dniState === "error" && (
                <div
                  className="verified"
                  style={{ background: "#fff1ef", borderColor: "#f1ceca", color: "var(--red)" }}
                  role="alert"
                >
                  <X size={18} /> No pudimos consultar tu identidad en este momento.
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ marginLeft: "auto", padding: "4px 10px" }}
                    onClick={() => queryDni(dni)}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {dniState === "taken" && (
                <div
                  className="verified"
                  style={{ background: "#fff1ef", borderColor: "#f1ceca", color: "var(--red)" }}
                  role="alert"
                >
                  <X size={18} /> Ya existe una cuenta con este DNI. Inicia sesión en su lugar.
                </div>
              )}
              {dniState === "ok" && identity && (
                <div className="result-card">
                  <div className="result-head">
                    <Check size={18} /> Identidad encontrada
                    <span className="badge ok" style={{ marginLeft: "auto" }}>
                      RENIEC
                    </span>
                  </div>
                  <div className="result-grid">
                    <div>
                      <span>Nombres</span>
                      <b>{identity.nombres}</b>
                    </div>
                    <div>
                      <span>Apellido paterno</span>
                      <b>{identity.apellidoPaterno}</b>
                    </div>
                    <div>
                      <span>Apellido materno</span>
                      <b>{identity.apellidoMaterno}</b>
                    </div>
                    <div>
                      <span>Documento</span>
                      <b>DNI {dni}</b>
                    </div>
                  </div>
                </div>
              )}
              <div className="field">
                <label>Correo institucional</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmail(e.target.value)}
                  placeholder="nombre@tuinstitucion.pe"
                  disabled={emailState === "verified"}
                />
                {email.length > 0 && !emailFormatValid && (
                  <div style={{ color: "var(--red)", fontSize: 12, marginTop: 7 }} role="alert">
                    Usa un correo de tu institución; no se admiten dominios personales.
                  </div>
                )}
              </div>
              {emailState === "idle" && (
                <>
                  <button
                    className="btn secondary"
                    style={{ width: "100%", marginBottom: 16 }}
                    disabled={!emailFormatValid || dniState !== "ok"}
                    onClick={sendEmailCode}
                  >
                    Verificar correo institucional
                  </button>
                  <ErrorNote message={emailError} />
                </>
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
                    Enviamos un código de verificación a {email}.{" "}
                    {devCode ? (
                      <>
                        Código (modo demo): <b>{devCode}</b>
                      </>
                    ) : (
                      "Puede tardar un par de minutos y llegar a spam."
                    )}
                  </p>
                  <div className="field">
                    <label>Código de 6 dígitos</label>
                    <input
                      value={emailCode}
                      onChange={(e) => {
                        setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setCodeError(null);
                      }}
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </div>
                  {codeError && (
                    <p style={{ color: "var(--red)", fontSize: 12 }} role="alert">
                      {codeError}
                    </p>
                  )}
                  <button
                    className="btn primary"
                    disabled={emailCode.length !== 6}
                    onClick={confirmEmailCode}
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
                    setCmp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setCmpState("idle");
                    setManualReview(false);
                  }}
                  placeholder="Ej. 045210"
                  inputMode="numeric"
                  style={{ fontSize: 23, letterSpacing: ".12em" }}
                />
              </div>
              {cmpState === "idle" && !manualReview && (
                <button
                  className="btn primary"
                  style={{ width: "100%" }}
                  disabled={cmp.length === 0}
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
                        <b>{fullName}</b>
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
              {institutions.loading && !institutions.data && <p className="muted">Cargando instituciones…</p>}
              {(institutions.data?.institutions ?? []).map((inst) => (
                <button
                  type="button"
                  className={`institution institution-rich ${institutionId === inst.id ? "selected" : ""}`}
                  key={inst.id}
                  onClick={() => {
                    setInstitutionId(inst.id);
                    setInstitutionError(null);
                  }}
                >
                  <span className="institution-logo">
                    <Building2 size={22} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <b>{inst.name}</b>
                    <small>
                      {inst.kind} · <MapPin size={12} /> {inst.city}
                    </small>
                  </span>
                  <span className={`selection-dot ${institutionId === inst.id ? "checked" : ""}`}>
                    {institutionId === inst.id && <Check size={14} />}
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
                <>
                  <button
                    className="btn primary"
                    style={{ width: "100%" }}
                    disabled={!institutionId}
                    onClick={linkInstitution}
                  >
                    Validar vínculo institucional <ArrowRight size={18} />
                  </button>
                  <ErrorNote message={institutionError} />
                </>
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
                    <p>{selectedInstitution?.name} revisará la solicitud antes de habilitar datos clínicos.</p>
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
                    <ErrorNote message={passError} />
                    <button className="btn primary" disabled={passBusy} onClick={setupPasskey}>
                      <Fingerprint size={18} /> {passBusy ? "Esperando al dispositivo…" : "Configurar Passkey"}
                    </button>
                    <button className="btn ghost" style={{ marginTop: 10 }} onClick={next}>
                      Continuar sin Passkey por ahora
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
            </>
          )}
          {step === 5 && (
            <>
              <div style={{ textAlign: "center" }}>
                <div className="passkey-icon">
                  <Check size={38} />
                </div>
                <div className="eyebrow">Registro completado</div>
                <h1>Todo está listo, {identity?.nombres}</h1>
                <p>Tu identidad y tu correo institucional quedaron verificados.</p>
              </div>
              <div className="result-card">
                <div className="result-grid">
                  <div>
                    <span>Profesional</span>
                    <b>{fullName}</b>
                  </div>
                  <div>
                    <span>CMP</span>
                    <b>{manualReview ? "En revisión" : cmp}</b>
                  </div>
                  <div>
                    <span>Institución</span>
                    <b>{selectedInstitution?.name}</b>
                  </div>
                  <div>
                    <span>Estado de la cuenta</span>
                    <b style={{ color: "#a06c1c" }}>Pendiente de aprobación</b>
                  </div>
                </div>
              </div>
              {[
                "Identidad verificada",
                manualReview ? "CMP en revisión manual" : "CMP verificado",
                "Vínculo institucional enviado",
                pass === "ok" ? "Passkey configurada" : "Passkey pendiente (configúrala luego en Seguridad)",
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
