"use client";
import { useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Fingerprint,
  Home,
  LockKeyhole,
  MapPin,
  Menu,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Upload,
  Users,
  X,
} from "lucide-react";

type Screen =
  | "landing"
  | "login"
  | "onboarding"
  | "home"
  | "review"
  | "history"
  | "security"
  | "audit"
  | "admin"
  | "digitizer"
  | "status";
type Role = "MÉDICO" | "ADMIN" | "AUDITOR" | "DIGITALIZADOR";
const docs = [
  {
    id: "HC-2026-00182",
    patient: "Lucía Torres Vega",
    med: "Amoxicilina",
    dose: "500 mg",
    freq: "Cada 8 horas",
    duration: "7 días",
    confidence: 94,
    low: "dose",
  },
  {
    id: "HC-2026-00183",
    patient: "Mateo Ríos Luna",
    med: "Losartán",
    dose: "50 mg",
    freq: "Una vez al día",
    duration: "30 días",
    confidence: 97,
  },
  {
    id: "HC-2026-00184",
    patient: "Elena Campos Ruiz",
    med: "Paracetamol",
    dose: "500 mg",
    freq: "Cada 6 horas",
    duration: "3 días",
    confidence: 91,
    low: "freq",
  },
  {
    id: "HC-2026-00185",
    patient: "Tomás Silva Paz",
    med: "Omeprazol",
    dose: "20 mg",
    freq: "Antes del desayuno",
    duration: "14 días",
    confidence: 96,
  },
];

function Logo() {
  return (
    <div className="brand">
      <span className="brandmark">
        <ShieldCheck size={20} />
      </span>
      <span>Nexo Clínico</span>
    </div>
  );
}
function Landing({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="landing">
      <nav>
        <Logo />
        <button className="btn ghost" onClick={() => go("login")}>
          Iniciar sesión
        </button>
      </nav>
      <main className="hero">
        <section>
          <div className="eyebrow">Documentación clínica protegida</div>
          <h1>Digitalización clínica segura, validada por profesionales.</h1>
          <p>
            La inteligencia artificial agiliza la transcripción. Tú conservas la
            decisión clínica, con controles de seguridad que se adaptan al
            riesgo.
          </p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => go("onboarding")}>
              Registrar profesional <ArrowRight size={18} />
            </button>
            <button className="btn secondary" onClick={() => go("login")}>
              Iniciar sesión
            </button>
          </div>
          <p style={{ fontSize: 13, marginTop: 28 }}>
            Demo con datos ficticios · Sin información clínica real
          </p>
        </section>
        <div className="hero-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <b>Revisión asistida</b>
            <span className="badge ok">Protegido</span>
          </div>
          <div className="mini-doc">
            <div className="mini-line" style={{ width: "40%" }} />
            <div className="mini-line" />
            <div className="mini-line" style={{ width: "86%" }} />
            <div className="mini-line" style={{ width: "72%" }} />
          </div>
          <div className="verified">
            <Check size={19} /> IA propone · El profesional decide
          </div>
        </div>
      </main>
    </div>
  );
}
function Login({ go }: { go: (s: Screen) => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="landing">
      <nav>
        <Logo />
        <button className="btn ghost" onClick={() => go("landing")}>
          <ArrowLeft size={17} /> Volver
        </button>
      </nav>
      <main
        style={{ display: "grid", placeItems: "center", padding: "11vh 20px" }}
      >
        <div
          className="form-card"
          style={{
            maxWidth: 430,
            textAlign: "center",
            background: "white",
            padding: 38,
            border: "1px solid var(--line)",
            borderRadius: 20,
          }}
        >
          <div className="passkey-icon">
            <Fingerprint size={35} />
          </div>
          <h1 style={{ fontSize: 30 }}>Bienvenido de nuevo</h1>
          <p>Accede de forma segura con este dispositivo.</p>
          {loading ? (
            <>
              <div className="spinner" />
              <p>Confirmando con Windows Hello…</p>
            </>
          ) : (
            <>
              <button
                className="btn primary"
                style={{ width: "100%" }}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => go("home"), 1100);
                }}
              >
                <Fingerprint size={19} /> Continuar con Passkey
              </button>
              <button
                className="btn ghost"
                style={{ width: "100%", marginTop: 9 }}
              >
                Usar otro método
              </button>
            </>
          )}
          <p style={{ fontSize: 12, marginTop: 25 }}>
            Proveedor de identidad: Keycloak · Simulación
          </p>
        </div>
      </main>
    </div>
  );
}
function Onboarding({ done }: { done: () => void }) {
  const [step, setStep] = useState(1);
  const [dni, setDni] = useState("");
  const [dniState, setDniState] = useState<"idle" | "loading" | "ok" | "bad">(
    "idle",
  );
  const dniRequest = useRef(0);
  const [email, setEmail] = useState("c.mendoza@hospitaldemo.pe");
  const [emailState, setEmailState] = useState<
    "idle" | "sending" | "sent" | "verified"
  >("idle");
  const [emailCode, setEmailCode] = useState("");
  const [cmp, setCmp] = useState("084521");
  const [cmpState, setCmpState] = useState<"idle" | "loading" | "ok" | "bad">(
    "idle",
  );
  const [institution, setInstitution] = useState("Hospital Regional Demo");
  const [institutionState, setInstitutionState] = useState<
    "idle" | "checking" | "linked"
  >("idle");
  const [pass, setPass] = useState<"idle" | "ok">("idle");
  const [passDialog, setPassDialog] = useState<
    "closed" | "intro" | "checking" | "success"
  >("closed");
  const next = () => setStep((s) => Math.min(5, s + 1));
  const genericDomains = [
    "gmail.com",
    "hotmail.com",
    "outlook.com",
    "yahoo.com",
  ];
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    !genericDomains.includes(emailDomain);
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
      const obviouslyInvalid = new Set(normalized).size === 1;
      setDniState(obviouslyInvalid ? "bad" : "ok");
    }, 850);
  };
  const verify = () => {
    setCmpState("loading");
    setTimeout(() => setCmpState(cmp === "000000" ? "bad" : "ok"), 900);
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
              <p>
                Necesitamos información básica para crear tu perfil profesional.
              </p>
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
                <div
                  id="dni-help"
                  className="muted"
                  style={{ fontSize: 12, marginTop: 7 }}
                >
                  Completa los 8 dígitos para consultar. Prueba 00000000 para el
                  caso inválido.
                </div>
              </div>
              {dniState === "loading" && (
                <div
                  className="result-card"
                  style={{ padding: 20 }}
                  aria-live="polite"
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      className="spinner"
                      style={{ width: 26, height: 26, margin: 0 }}
                    />
                    <b>Consultando datos de identidad…</b>
                  </div>
                  <div className="mini-line" style={{ marginTop: 18 }} />
                  <div className="mini-line" style={{ width: "68%" }} />
                </div>
              )}
              {dniState === "bad" && (
                <div
                  className="verified"
                  style={{
                    background: "#fff1ef",
                    borderColor: "#f1ceca",
                    color: "var(--red)",
                  }}
                  role="alert"
                >
                  <X size={18} /> No pudimos encontrar datos para este DNI.
                  Revisa el número e inténtalo nuevamente.
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
                  <div className="verified" aria-live="polite">
                    <Check size={18} /> Datos de identidad verificados y no
                    editables
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
                  aria-invalid={email.length > 0 && !emailValid}
                  disabled={emailState === "verified"}
                />
                {email.length > 0 && !emailValid && (
                  <div
                    style={{ color: "var(--red)", fontSize: 12, marginTop: 7 }}
                    role="alert"
                  >
                    Usa un correo de tu institución; no se admiten dominios
                    personales.
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
                <div className="verified" aria-live="polite">
                  <div
                    className="spinner"
                    style={{ width: 22, height: 22, margin: 0 }}
                  />
                  Enviando correo de verificación…
                </div>
              )}
              {emailState === "sent" && (
                <div className="result-card" style={{ padding: 20 }}>
                  <b>Revisa tu correo</b>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Enviamos un código simulado a {email}. Para esta demo usa{" "}
                    <b>246810</b>.
                  </p>
                  <div className="field">
                    <label>Código de 6 dígitos</label>
                    <input
                      value={emailCode}
                      onChange={(e) =>
                        setEmailCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                    />
                  </div>
                  {emailCode.length === 6 && emailCode !== "246810" && (
                    <p
                      style={{ color: "var(--red)", fontSize: 12 }}
                      role="alert"
                    >
                      El código no es válido.
                    </p>
                  )}
                  <button
                    className="btn primary"
                    disabled={emailCode !== "246810"}
                    onClick={() => setEmailState("verified")}
                  >
                    Confirmar código
                  </button>
                  <button className="btn ghost" onClick={sendEmailCode}>
                    Reenviar correo
                  </button>
                </div>
              )}
              {emailState === "verified" && (
                <div className="verified" aria-live="polite">
                  <Check size={18} /> Correo institucional verificado
                </div>
              )}
              <p className="muted" style={{ fontSize: 12 }}>
                Simulación de consulta de identidad con datos ficticios.
              </p>
              <button
                className="btn primary"
                disabled={dniState !== "ok" || emailState !== "verified"}
                style={{
                  width: "100%",
                  opacity:
                    dniState === "ok" && emailState === "verified" ? 1 : 0.45,
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
              <p>
                Ingresa tu número de colegiatura. Esta consulta es una
                simulación de verificación CMP.
              </p>
              <div className="field">
                <label>Número CMP</label>
                <input
                  value={cmp}
                  onChange={(e) => {
                    setCmp(e.target.value);
                    setCmpState("idle");
                  }}
                  style={{ fontSize: 23, letterSpacing: ".12em" }}
                />
              </div>
              {cmpState === "idle" && (
                <button
                  className="btn primary"
                  style={{ width: "100%" }}
                  onClick={verify}
                >
                  Verificar CMP
                </button>
              )}
              {cmpState === "loading" && (
                <div className="result-card" style={{ padding: 25 }}>
                  <div className="mini-line" />
                  <div className="mini-line" style={{ width: "70%" }} />
                  <div className="mini-line" style={{ width: "85%" }} />
                </div>
              )}
              {cmpState === "bad" && (
                <div className="result-card">
                  <div
                    className="result-head"
                    style={{ background: "#fff1ef", color: "var(--red)" }}
                  >
                    <X size={18} /> No pudimos verificar este CMP.
                  </div>
                  <div style={{ padding: 20 }}>
                    <p className="muted">
                      Revisa el número o solicita una validación por parte de la
                      institución.
                    </p>
                    <button
                      className="btn secondary"
                      onClick={() => setCmpState("idle")}
                    >
                      Intentar nuevamente
                    </button>{" "}
                    <button className="btn ghost">
                      Solicitar revisión manual
                    </button>
                  </div>
                </div>
              )}
              {cmpState === "ok" && (
                <>
                  <div className="result-card">
                    <div className="result-head">
                      <Check size={18} /> Profesional encontrado{" "}
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
                        <b>084521</b>
                      </div>
                      <div>
                        <span>Estado</span>
                        <b style={{ color: "var(--green)" }}>HÁBIL</b>
                      </div>
                      <div>
                        <span>Consejo regional</span>
                        <b>La Libertad</b>
                      </div>
                      <div>
                        <span>Especialidad</span>
                        <b>Medicina Interna</b>
                      </div>
                      <div>
                        <span>RNE</span>
                        <b>045821</b>
                      </div>
                      <div>
                        <span>Fuente</span>
                        <b>Colegio Médico del Perú</b>
                      </div>
                      <div>
                        <span>Última verificación</span>
                        <b>Hoy</b>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn primary"
                    style={{ width: "100%" }}
                    onClick={next}
                  >
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
              <p>
                Tu institución validará este vínculo antes de habilitar accesos
                clínicos.
              </p>
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
                  <span
                    className={`selection-dot ${institution === name ? "checked" : ""}`}
                  >
                    {institution === name && <Check size={14} />}
                  </span>
                </button>
              ))}
              <div className="grid2" style={{ marginTop: 20 }}>
                <div className="field">
                  <label>Servicio</label>
                  <select defaultValue="Medicina Interna">
                    <option>Emergencia</option>
                    <option>Medicina Interna</option>
                    <option>Cardiología</option>
                    <option>Neurología</option>
                  </select>
                </div>
                <div className="field">
                  <label>Cargo</label>
                  <input value="Médico" readOnly />
                </div>
              </div>
              <div
                className="verified"
                style={{
                  background: "#fff7e7",
                  borderColor: "#f1ddb4",
                  color: "#745315",
                }}
              >
                <AlertTriangle size={18} /> Un CMP válido no habilita
                automáticamente el acceso clínico.
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
                <div className="status-progress" aria-live="polite">
                  <div
                    className="spinner"
                    style={{ width: 28, height: 28, margin: 0 }}
                  />
                  <div>
                    <b>Registrando tu vínculo…</b>
                    <small>Comprobando institución, servicio y cargo</small>
                  </div>
                </div>
              )}
              {institutionState === "linked" && (
                <div className="success-panel pop-in" aria-live="polite">
                  <span className="success-check">
                    <Check size={22} />
                  </span>
                  <div>
                    <b>Vínculo institucional registrado</b>
                    <p>
                      {institution} revisará la solicitud antes de habilitar
                      datos clínicos.
                    </p>
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
                Utiliza la seguridad de tu dispositivo para confirmar tu
                identidad sin introducir códigos constantemente.
              </p>
              <div className="passkey-card">
                <div className="passkey-icon">
                  {pass === "ok" ? (
                    <Check size={35} />
                  ) : (
                    <Fingerprint size={35} />
                  )}
                </div>
                <h2>Passkey</h2>
                {pass === "idle" && (
                  <>
                    <p className="muted">
                      Confirma acciones sensibles con la seguridad que ya usas
                      para desbloquear tu equipo.
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
                    <button
                      className="btn primary"
                      onClick={() => setPassDialog("intro")}
                    >
                      Configurar Passkey
                    </button>
                  </>
                )}
                {pass === "ok" && (
                  <>
                    <div
                      className="verified"
                      style={{ justifyContent: "center" }}
                    >
                      <Check size={18} /> Passkey configurada
                    </div>
                    <p>
                      <b>Surface · Windows Hello</b>
                      <br />
                      <span className="muted">Dispositivo confiable</span>
                    </p>
                    <button className="btn primary" onClick={next}>
                      Continuar
                    </button>
                  </>
                )}
              </div>
              <p style={{ fontSize: 13, textAlign: "center" }}>
                <LockKeyhole
                  size={14}
                  style={{ display: "inline", marginRight: 5 }}
                />
                Tu información biométrica permanece en tu dispositivo.
              </p>
              {passDialog !== "closed" && (
                <div className="modal-back">
                  <div className="modal device-dialog pop-in">
                    {passDialog === "intro" && (
                      <>
                        <div className="device-top">
                          <span>Seguridad de Windows</span>
                          <button
                            aria-label="Cerrar"
                            onClick={() => setPassDialog("closed")}
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <div className="passkey-icon">
                          <Fingerprint size={36} />
                        </div>
                        <h2>Crear una passkey</h2>
                        <p className="muted">
                          Usaremos Windows Hello para proteger esta cuenta en tu
                          Surface.
                        </p>
                        <div className="privacy-note">
                          <ShieldCheck size={20} />
                          <span>
                            <b>Tu biometría no se comparte</b>
                            <small>
                              Nexo Clínico solo recibe una confirmación segura.
                            </small>
                          </span>
                        </div>
                        <button
                          className="btn primary"
                          style={{ width: "100%" }}
                          onClick={() => {
                            setPassDialog("checking");
                            setTimeout(() => setPassDialog("success"), 1500);
                          }}
                        >
                          Continuar con Windows Hello
                        </button>
                        <button
                          className="btn ghost"
                          style={{ width: "100%" }}
                          onClick={() => setPassDialog("closed")}
                        >
                          Ahora no
                        </button>
                      </>
                    )}
                    {passDialog === "checking" && (
                      <div className="device-checking" aria-live="polite">
                        <div className="scan-rings">
                          <span>
                            <Fingerprint size={38} />
                          </span>
                        </div>
                        <h2>Confirma en tu dispositivo</h2>
                        <p className="muted">
                          Verificando Windows Hello de forma segura…
                        </p>
                        <div className="progress-track">
                          <i />
                        </div>
                      </div>
                    )}
                    {passDialog === "success" && (
                      <div
                        className="device-checking pop-in"
                        aria-live="polite"
                      >
                        <div className="success-orbit">
                          <Check size={34} />
                        </div>
                        <h2>Passkey creada</h2>
                        <p className="muted">
                          Surface · Windows Hello se agregó como dispositivo
                          confiable.
                        </p>
                        <div className="verified">
                          <Check size={18} /> Dispositivo confiable
                        </div>
                        <button
                          className="btn primary"
                          style={{ width: "100%" }}
                          onClick={() => {
                            setPass("ok");
                            setPassDialog("closed");
                          }}
                        >
                          Listo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                <p>
                  Tu identidad profesional y dispositivo quedaron verificados.
                </p>
              </div>
              <div className="result-card">
                <div className="result-grid">
                  <div>
                    <span>Profesional</span>
                    <b>Carlos Mendoza Salazar</b>
                  </div>
                  <div>
                    <span>CMP</span>
                    <b>084521</b>
                  </div>
                  <div>
                    <span>Especialidad</span>
                    <b>Medicina Interna</b>
                  </div>
                  <div>
                    <span>Institución</span>
                    <b>Hospital Regional Demo</b>
                  </div>
                </div>
              </div>
              {[
                "Identidad verificada",
                "CMP verificado",
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
                onClick={done}
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

const navByRole: Record<
  Role,
  { label: string; screen: Screen; icon: typeof Home }[]
> = {
  MÉDICO: [
    { label: "Inicio", screen: "home", icon: Home },
    { label: "Revisión", screen: "review", icon: ClipboardCheck },
    { label: "Historial", screen: "history", icon: FileCheck2 },
    { label: "Seguridad", screen: "security", icon: ShieldCheck },
  ],
  ADMIN: [
    { label: "Inicio", screen: "home", icon: Home },
    { label: "Profesionales", screen: "admin", icon: Users },
    { label: "Roles", screen: "admin", icon: LockKeyhole },
    { label: "Configuración", screen: "status", icon: Activity },
  ],
  AUDITOR: [
    { label: "Auditoría", screen: "audit", icon: ClipboardCheck },
    { label: "Alertas", screen: "audit", icon: AlertTriangle },
    { label: "Accesos excepcionales", screen: "audit", icon: LockKeyhole },
  ],
  DIGITALIZADOR: [
    { label: "Digitalizar", screen: "digitizer", icon: ScanLine },
    { label: "Pendientes", screen: "digitizer", icon: Upload },
    { label: "Historial", screen: "history", icon: FileCheck2 },
  ],
};
function Sidebar({
  role,
  screen,
  go,
}: {
  role: Role;
  screen: Screen;
  go: (s: Screen) => void;
}) {
  return (
    <aside className="sidebar">
      <Logo />
      <div className="nav">
        {navByRole[role].map(({ label, screen: s, icon: I }) => (
          <button
            className={screen === s ? "active" : ""}
            onClick={() => go(s)}
            key={label}
          >
            <I size={19} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="profile">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="avatar">CM</div>
          <div>
            <b style={{ fontSize: 13 }}>Carlos Mendoza</b>
            <div className="muted" style={{ fontSize: 11 }}>
              CMP 084521
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
function HomePage({ go, role }: { go: (s: Screen) => void; role: Role }) {
  if (role === "AUDITOR") return <Audit />;
  if (role === "DIGITALIZADOR") return <Digitizer />;
  if (role === "ADMIN") return <Admin />;
  return (
    <>
      <div className="pagehead">
        <div>
          <p className="muted" style={{ margin: 0 }}>
            Viernes, 4 de septiembre
          </p>
          <h1>Buenos días, Carlos.</h1>
          <p className="muted">Tienes 12 transcripciones pendientes.</p>
        </div>
        <span className="badge ok">
          <ShieldCheck size={13} style={{ display: "inline" }} /> Sesión
          protegida
        </span>
      </div>
      <div className="stats">
        <div className="stat">
          <strong>12</strong>
          <span className="muted">Pendientes de revisión</span>
        </div>
        <div className="stat">
          <strong>3</strong>
          <span className="muted">Requieren atención</span>
        </div>
        <div className="stat">
          <strong>24</strong>
          <span className="muted">Validadas hoy</span>
        </div>
      </div>
      <div className="feature">
        <div>
          <div className="eyebrow">Tu tarea principal</div>
          <h2>Revisar transcripciones clínicas</h2>
          <p className="muted">
            Compara el documento original con la propuesta de IA.
          </p>
        </div>
        <button className="btn primary" onClick={() => go("review")}>
          Comenzar revisión <ArrowRight size={18} />
        </button>
      </div>
      <div className="subsection">
        <h2>Continuar donde lo dejaste</h2>
        <div className="listrow">
          <div>
            <b>Historia clínica HC-2026-00182</b>
            <div className="muted">Lucía Torres Vega · Medicina Interna</div>
          </div>
          <button className="btn secondary" onClick={() => go("review")}>
            Continuar <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </>
  );
}
function Review({
  go,
  onDenied,
  onRisk,
  onAnomaly,
}: {
  go: (s: Screen) => void;
  onDenied: () => void;
  onRisk: boolean;
  onAnomaly: (reason: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [fixed, setFixed] = useState(0);
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(false);
  const [stepup, setStepup] = useState<"closed" | "idle" | "loading" | "done">(
    "closed",
  );
  const decisionTimes = useRef<number[]>([]);
  const d = docs[idx % docs.length];
  const advance = (kind: "ok" | "fix") => {
    const now = Date.now();
    decisionTimes.current = [...decisionTimes.current, now].filter(
      (time) => now - time < 4000,
    );
    if (decisionTimes.current.length >= 3 && !onRisk) {
      decisionTimes.current = [];
      onAnomaly("3 decisiones clínicas en menos de 4 segundos");
    }
    if (kind === "ok") setCorrect((x) => x + 1);
    else setFixed((x) => x + 1);
    setEditing(false);
    if (correct + fixed >= 3) setSummary(true);
    else setIdx((x) => x + 1);
  };
  if (summary)
    return (
      <>
        <div className="pagehead">
          <div>
            <div className="eyebrow">Lote finalizado</div>
            <h1>Revisión completada</h1>
            <p className="muted">
              La revisión positiva aún no es una aprobación clínica definitiva.
            </p>
          </div>
        </div>
        <div className="feature" style={{ display: "block", maxWidth: 700 }}>
          <Check size={38} color="var(--green)" />
          <h2>{correct + fixed} documentos revisados</h2>
          <div className="stats" style={{ marginTop: 22 }}>
            <div className="stat">
              <strong>{correct}</strong>Correctos
            </div>
            <div className="stat">
              <strong>{fixed}</strong>Corregidos
            </div>
            <div className="stat">
              <strong>0</strong>Pendientes
            </div>
          </div>
          <button className="btn primary" onClick={() => setStepup("idle")}>
            Confirmar validaciones
          </button>
        </div>
        {stepup !== "closed" && (
          <StepUp
            state={stepup}
            setState={setStepup}
            onDone={() => go("history")}
          />
        )}
      </>
    );
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Revisión clínica</h1>
          <p className="muted">
            Documento {idx + 1} de 12 · IA propone, tú decides.
          </p>
        </div>
        <div>
          <button className="btn ghost" onClick={onDenied}>
            Probar acceso restringido
          </button>
          <span className={`badge ${onRisk ? "warn" : "ok"}`}>
            {onRisk ? "Verificación requerida" : "Riesgo bajo"}
          </span>
          <span className="badge" style={{ marginLeft: 8 }}>
            IP 203.0.113.42
          </span>
        </div>
      </div>
      <div className="review-layout">
        <div className="panel">
          <div className="panel-head">
            <b>Documento original</b>
            <span className="badge">Escaneo</span>
          </div>
          <div className="scan">
            <h3>HOSPITAL REGIONAL DEMO</h3>
            <p>Paciente: {d.patient}</p>
            <p>Fecha: 04/09/2026</p>
            <hr />
            <p>Rp.</p>
            <p style={{ fontSize: 24, fontStyle: "italic" }}>{d.med}</p>
            <p>
              {d.dose} — {d.freq}
            </p>
            <p>Durante {d.duration}</p>
            <br />
            <p style={{ textAlign: "right", fontStyle: "italic" }}>
              Firma profesional
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <b>Transcripción IA</b>
              <div className="muted" style={{ fontSize: 12 }}>
                Generada automáticamente · Requiere validación humana
              </div>
            </div>
            <span className="badge ok">Confianza {d.confidence}%</span>
          </div>
          <div className="transcription">
            {[
              ["Medicamento", d.med, "med"],
              ["Dosis", d.dose, "dose"],
              ["Frecuencia", d.freq, "freq"],
              ["Duración", d.duration, "duration"],
            ].map(([l, v, k]) => (
              <div className="trans-field" key={k}>
                <label>{l}</label>
                {editing && k === (d.low || "dose") ? (
                  <input
                    defaultValue={v}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: 10,
                      border: "2px solid var(--teal)",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <b>{v}</b>
                )}
                {d.low === k && !editing && (
                  <span className="badge warn" style={{ float: "right" }}>
                    <AlertTriangle size={12} style={{ display: "inline" }} />{" "}
                    Verificar
                  </span>
                )}
              </div>
            ))}
            {editing ? (
              <div className="review-actions">
                <button className="btn ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
                <button className="btn primary" onClick={() => advance("fix")}>
                  <Check size={18} /> Guardar corrección
                </button>
              </div>
            ) : (
              <div className="review-actions">
                <button
                  className="btn secondary"
                  onClick={() => setEditing(true)}
                >
                  <ArrowLeft size={18} /> Corregir
                </button>
                <button className="btn primary" onClick={() => advance("ok")}>
                  Correcto <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
function StepUp({
  state,
  setState,
  onDone,
}: {
  state: "idle" | "loading" | "done";
  setState: (x: "idle" | "loading" | "done") => void;
  onDone: () => void;
}) {
  return (
    <div className="modal-back">
      <div className="modal">
        {state === "idle" && (
          <>
            <div className="passkey-icon">
              <Fingerprint size={34} />
            </div>
            <h2>Confirma que eres tú</h2>
            <p className="muted">
              Esta acción validará clínicamente los documentos revisados.
            </p>
            <button
              className="btn primary"
              style={{ width: "100%" }}
              onClick={() => {
                setState("loading");
                setTimeout(() => setState("done"), 900);
              }}
            >
              Confirmar con Windows Hello
            </button>
            <p style={{ fontSize: 12, textAlign: "center" }} className="muted">
              WebAuthn · Autenticación reforzada
            </p>
          </>
        )}
        {state === "loading" && (
          <>
            <div className="spinner" />
            <h2 style={{ textAlign: "center" }}>Confirmando identidad…</h2>
          </>
        )}
        {state === "done" && (
          <>
            <div className="passkey-icon">
              <Check size={35} />
            </div>
            <h2 style={{ textAlign: "center" }}>Documentos validados</h2>
            <div className="verified">
              <Check size={18} /> Identidad confirmada con Passkey
            </div>
            <button
              className="btn primary"
              style={{ width: "100%" }}
              onClick={onDone}
            >
              Ver trazabilidad
            </button>
          </>
        )}
      </div>
    </div>
  );
}
function History() {
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Historial clínico</h1>
          <p className="muted">Versiones aprobadas y su trazabilidad.</p>
        </div>
      </div>
      <div className="review-layout">
        <div className="panel">
          <div className="panel-head">
            <b>HC-2026-00182</b>
            <span className="badge ok">Aprobado</span>
          </div>
          <div className="transcription">
            <div className="result-grid" style={{ padding: 0 }}>
              {[
                ["Versión", "3"],
                ["Aprobado por", "Carlos Mendoza Salazar"],
                ["CMP", "084521"],
                ["Fecha", "04 sep 2026 · 10:42"],
                ["Integridad", "✓ Verificada"],
                ["Método", "Passkey / WebAuthn"],
                ["Hash original", "8c42…91ac"],
                ["Hash transcripción", "40ef…a821"],
              ].map((x) => (
                <div key={x[0]}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {x[0]}
                  </span>
                  <br />
                  <b>{x[1]}</b>
                </div>
              ))}
            </div>
            <div className="verified">
              <ShieldCheck size={18} /> Storage privado · Cifrado en reposo ·
              TLS
            </div>
            <p style={{ fontSize: 12 }} className="muted">
              Simulación de arquitectura de seguridad. Cualquier modificación
              generará una nueva versión que requerirá aprobación.
            </p>
            <button
              className="btn secondary"
              onClick={() =>
                alert(
                  "No puedes sobrescribir una versión aprobada. Se creará una nueva versión pendiente.",
                )
              }
            >
              Crear nueva versión
            </button>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <b>Versionado</b>
            <span className="badge">Inmutable</span>
          </div>
          <div className="transcription">
            <div className="timeline">
              <div className="timeitem">
                <b>Versión 3</b>
                <div>Aprobada · Actual</div>
              </div>
              <div className="timeitem">
                <b>Versión 2</b>
                <div>Corregida por médico · Pendiente</div>
              </div>
              <div className="timeitem">
                <b>Versión 1</b>
                <div>Transcripción IA · Pendiente</div>
              </div>
            </div>
            <div
              className="verified"
              style={{
                background: "#fff7e7",
                borderColor: "#f1ddb4",
                color: "#745315",
              }}
            >
              Una versión aprobada no se puede sobrescribir.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
const events = [
  ["10:42", "Carlos Mendoza", "TRANSCRIPTION_APPROVE", "HC-00182", "ALLOW"],
  ["10:38", "Carlos Mendoza", "TRANSCRIPTION_EDIT", "HC-00182", "ALLOW"],
  ["10:31", "Carlos Mendoza", "ACCESS_DENIED", "HC-00441", "DENY"],
  ["10:30", "Sistema", "ANOMALY_DETECTED", "Sesión 82A", "REVIEW"],
  ["10:12", "Carlos Mendoza", "LOGIN_SUCCESS", "Sesión 82A", "ALLOW"],
  ["09:54", "Ana Valdivia", "BREAK_GLASS", "HC-00209", "ALLOW"],
];
function Audit() {
  const [selected, setSelected] = useState(0);
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Auditoría</h1>
          <p className="muted">
            Trazabilidad protegida de acciones relevantes.
          </p>
        </div>
        <span className="badge ok">
          <LockKeyhole size={12} style={{ display: "inline" }} /> Registro
          protegido
        </span>
      </div>
      <div
        style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}
      >
        {["Usuario", "Acción", "Fecha", "Resultado", "Nivel de riesgo"].map(
          (x) => (
            <button className="btn secondary" key={x}>
              {x} <ChevronRight size={14} />
            </button>
          ),
        )}
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Recurso</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr
                key={i}
                onClick={() => setSelected(i)}
                style={{
                  cursor: "pointer",
                  background: selected === i ? "#f0f7f5" : "",
                }}
              >
                {e.map((v, j) => (
                  <td key={j}>
                    {j === 4 ? (
                      <span className={`badge ${v === "DENY" ? "bad" : "ok"}`}>
                        {v}
                      </span>
                    ) : (
                      v
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="transcription" style={{ background: "#f7f9f8" }}>
          <b>Detalle del evento</b>
          <div className="result-grid">
            <div>
              <span>Usuario</span>
              <b>{events[selected][1]}</b>
            </div>
            <div>
              <span>CMP</span>
              <b>084521</b>
            </div>
            <div>
              <span>Acción</span>
              <b>{events[selected][2]}</b>
            </div>
            <div>
              <span>Risk score</span>
              <b>{selected === 3 ? "74 · Alto" : "12 · Bajo"}</b>
            </div>
            <div>
              <span>Autenticación</span>
              <b>WebAuthn</b>
            </div>
            <div>
              <span>Dirección IP</span>
              <b>203.0.113.42</b>
            </div>
            <div>
              <span>Integridad</span>
              <b>Verificada</b>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function Admin() {
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Profesionales</h1>
          <p className="muted">
            Gestión operativa sin acceso al contenido clínico.
          </p>
        </div>
        <button className="btn primary">Registrar profesional</button>
      </div>
      <div
        className="verified"
        style={{
          background: "#f2f5f4",
          color: "var(--ink)",
          borderColor: "var(--line)",
        }}
      >
        <ShieldCheck size={19} /> Separación de funciones: este rol no puede
        revisar ni aprobar documentos clínicos.
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>CMP</th>
              <th>Institución</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Carlos Mendoza", "084521", "Hospital Regional Demo", "Médico"],
              ["Ana Valdivia", "071402", "Clínica Demo Norte", "Médico"],
              ["Diego Robles", "062913", "Centro Médico Demo", "Médico"],
            ].map((x) => (
              <tr key={x[1]}>
                {x.map((v) => (
                  <td key={v}>{v}</td>
                ))}
                <td>
                  <span className="badge ok">Habilitado · CMP verificado</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Digitizer() {
  const [phase, setPhase] = useState(0);
  const states = [
    "Documento recibido",
    "Analizando documento…",
    "Transcripción generada",
    "Enviado a revisión médica",
  ];
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Digitalizar documento</h1>
          <p className="muted">
            Carga segura y preparación para revisión médica.
          </p>
        </div>
      </div>
      <div className="panel" style={{ maxWidth: 720 }}>
        <div
          className="empty"
          style={{ border: "2px dashed #cbd7d3", margin: 22, borderRadius: 14 }}
        >
          <Upload size={38} color="var(--teal)" />
          <h2>Selecciona un documento clínico</h2>
          <p>PDF, JPG o PNG · Datos ficticios para esta demo</p>
          <button
            className="btn primary"
            onClick={() => {
              setPhase(1);
              [2, 3, 4].forEach((n, i) =>
                setTimeout(() => setPhase(n), 700 * (i + 1)),
              );
            }}
          >
            Digitalizar documento
          </button>
        </div>
        {phase > 0 && (
          <div className="transcription">
            {states.map((s, i) => (
              <div className="listrow" key={s}>
                <span>{s}</span>
                {phase > i ? (
                  <Check size={18} color="var(--green)" />
                ) : (
                  <span className="badge">Pendiente</span>
                )}
              </div>
            ))}
            <div
              className="verified"
              style={{
                background: "#f2f5f4",
                color: "var(--ink)",
                borderColor: "var(--line)",
              }}
            >
              <LockKeyhole size={18} /> El digitalizador no puede aprobar
              documentos.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
function Security() {
  const [closed, setClosed] = useState(false);
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Seguridad de mi cuenta</h1>
          <p className="muted">
            Tus dispositivos, sesiones y actividad reciente.
          </p>
        </div>
      </div>
      <div className="review-layout">
        <div className="panel">
          <div className="panel-head">
            <b>Passkey</b>
            <span className="badge ok">Configurada</span>
          </div>
          <div className="transcription">
            <div className="listrow">
              <div>
                <b>Windows PC</b>
                <div className="muted">Surface · Windows Hello</div>
              </div>
              <span className="badge ok">Confiable</span>
            </div>
            <div className="listrow">
              <div>
                <b>Último acceso</b>
                <div className="muted">Hoy · 10:12</div>
              </div>
            </div>
            <div className="listrow">
              <div>
                <b>Dirección IP</b>
                <div className="muted">203.0.113.42 · Trujillo, Perú</div>
              </div>
              <span className="badge ok">Habitual</span>
            </div>
            <div className="listrow">
              <div>
                <b>Sesiones activas</b>
                <div className="muted">
                  {closed ? "Solo esta sesión" : "1 sesión adicional"}
                </div>
              </div>
              <button
                className="btn secondary"
                onClick={() => setClosed(true)}
                disabled={closed}
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
            {[
              "Inicio de sesión",
              "Validación de documentos",
              "Nuevo dispositivo verificado",
            ].map((x, i) => (
              <div className="listrow" key={x}>
                <span>{x}</span>
                <span className="muted">
                  {i === 0 ? "10:12" : i === 1 ? "Ayer" : "28 ago"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
function Status() {
  const [ai, setAi] = useState(true);
  const [risk, setRisk] = useState(true);
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Estado del sistema</h1>
          <p className="muted">Disponibilidad y comportamiento resiliente.</p>
        </div>
      </div>
      <div className="panel" style={{ maxWidth: 760 }}>
        <div className="transcription">
          {[
            ["Identidad", true],
            ["Aplicación", true],
            ["Transcripción IA", ai],
            ["Auditoría", true],
            ["Motor de riesgo", risk],
          ].map(([x, ok]) => (
            <div className="listrow" key={String(x)}>
              <b>{x}</b>
              <span className={`badge ${ok ? "ok" : "bad"}`}>
                {ok ? "Operativo" : "No disponible"}
              </span>
            </div>
          ))}
        </div>
      </div>
      {!ai && (
        <div className="verified" style={{ maxWidth: 760 }}>
          <Check /> La revisión manual continúa disponible.
        </div>
      )}
      {!risk && (
        <div
          className="verified"
          style={{ maxWidth: 760, background: "#fff7e7", color: "#745315" }}
        >
          <AlertTriangle /> Modo de seguridad reforzada: se solicitará
          autenticación adicional.
        </div>
      )}
      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button className="btn secondary" onClick={() => setAi(!ai)}>
          Simular IA {ai ? "no disponible" : "operativa"}
        </button>
        <button className="btn secondary" onClick={() => setRisk(!risk)}>
          Simular motor de riesgo {risk ? "no disponible" : "operativo"}
        </button>
      </div>
      <div className="subsection">
        <h2>Seguridad de plataforma</h2>
        <p className="muted">
          Vista técnica · Simulación de arquitectura de seguridad
        </p>
        {[
          "Dependencias bloqueadas",
          "Dependency scanning",
          "Secret scanning",
          "Docker image scanning",
          "SBOM generado",
          "Build verificado",
        ].map((x) => (
          <span
            className="badge ok"
            style={{ display: "inline-block", margin: "5px" }}
            key={x}
          >
            ✓ {x}
          </span>
        ))}
      </div>
    </>
  );
}
function AccessModal({ close }: { close: () => void }) {
  const [emergency, setEmergency] = useState(false);
  const [auth, setAuth] = useState(false);
  return (
    <div className="modal-back">
      <div className="modal">
        {!emergency ? (
          <>
            <div
              className="passkey-icon"
              style={{ background: "#fdeceb", color: "var(--red)" }}
            >
              <LockKeyhole />
            </div>
            <h2>No tienes acceso a esta historia clínica</h2>
            <p className="muted">
              No existe una relación asistencial activa con este paciente.
            </p>
            <div
              className="verified"
              style={{
                background: "#f3f5f4",
                color: "#44514d",
                borderColor: "var(--line)",
                fontSize: 12,
              }}
            >
              RBAC: PASS · ABAC: DENY · Relationship: NONE
            </div>
            <button className="btn secondary" onClick={close}>
              Volver
            </button>{" "}
            <button className="btn ghost" onClick={() => setEmergency(true)}>
              Solicitar acceso de emergencia
            </button>
          </>
        ) : !auth ? (
          <>
            <h2>Acceso de emergencia</h2>
            <p className="muted">
              Utiliza esta opción únicamente cuando el acceso inmediato sea
              necesario para la atención del paciente.
            </p>
            <div className="field">
              <label>Motivo obligatorio</label>
              <select>
                <option>Emergencia médica</option>
                <option>Atención no programada</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="field">
              <label>Justificación</label>
              <textarea
                placeholder="Describe brevemente la necesidad clínica"
                defaultValue="Paciente requiere evaluación inmediata en emergencia."
              />
            </div>
            <button
              className="btn primary"
              style={{ width: "100%" }}
              onClick={() => setAuth(true)}
            >
              Solicitar acceso excepcional
            </button>
          </>
        ) : (
          <>
            <div className="passkey-icon">
              <Fingerprint />
            </div>
            <h2>Confirma tu identidad</h2>
            <p className="muted">
              Este acceso será temporal y el evento quedará auditado.
            </p>
            <button
              className="btn primary"
              style={{ width: "100%" }}
              onClick={close}
            >
              Confirmar con Passkey
            </button>
          </>
        )}
      </div>
    </div>
  );
}
function DemoControl({
  role,
  setRole,
  risk,
  setRisk,
  go,
}: {
  role: Role;
  setRole: (r: Role) => void;
  risk: boolean;
  setRisk: (x: boolean) => void;
  go: (s: Screen) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="demo-control">
      {open && (
        <div className="demo-menu">
          <b>Control de demostración</b>
          <p style={{ fontSize: 12, color: "#b9c7c3" }}>
            Solo visible en el prototipo
          </p>
          <label>Ver experiencia como…</label>
          <select
            value={role}
            onChange={(e) => {
              const r = e.target.value as Role;
              setRole(r);
              go(
                r === "AUDITOR"
                  ? "audit"
                  : r === "ADMIN"
                    ? "admin"
                    : r === "DIGITALIZADOR"
                      ? "digitizer"
                      : "home",
              );
            }}
          >
            {["MÉDICO", "ADMIN", "AUDITOR", "DIGITALIZADOR"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <button
            className="btn"
            style={{ background: risk ? "#704029" : "#284a42", color: "white" }}
            onClick={() => setRisk(!risk)}
          >
            {risk ? "Restaurar riesgo bajo" : "Simular actividad anómala"}
          </button>
          <button
            className="btn"
            style={{ background: "#284a42", color: "white" }}
            onClick={() => go("status")}
          >
            Estado del sistema
          </button>
        </div>
      )}
      <button
        className="btn"
        style={{ background: "#182522", color: "white", borderRadius: 99 }}
        onClick={() => setOpen(!open)}
      >
        <Menu size={18} /> Demo
      </button>
    </div>
  );
}
export default function Page() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [role, setRole] = useState<Role>("MÉDICO");
  const [denied, setDenied] = useState(false);
  const [risk, setRiskState] = useState(false);
  const [riskModal, setRiskModal] = useState(false);
  const [riskReason, setRiskReason] = useState(
    "Dispositivo o patrón de uso no habitual",
  );
  const setRisk = (value: boolean, reason?: string) => {
    setRiskState(value);
    if (value) {
      setRiskReason(reason ?? "Dispositivo o patrón de uso no habitual");
      setRiskModal(true);
    }
  };
  if (screen === "landing") return <Landing go={setScreen} />;
  if (screen === "login") return <Login go={setScreen} />;
  if (screen === "onboarding")
    return <Onboarding done={() => setScreen("home")} />;
  return (
    <div className="app">
      <Sidebar role={role} screen={screen} go={setScreen} />
      <main className="main">
        {screen === "home" && <HomePage go={setScreen} role={role} />}{" "}
        {screen === "review" && (
          <Review
            go={setScreen}
            onDenied={() => setDenied(true)}
            onRisk={risk}
            onAnomaly={(reason) => setRisk(true, reason)}
          />
        )}{" "}
        {screen === "history" && <History />}{" "}
        {screen === "security" && <Security />}{" "}
        {screen === "audit" && <Audit />} {screen === "admin" && <Admin />}{" "}
        {screen === "digitizer" && <Digitizer />}{" "}
        {screen === "status" && <Status />}
      </main>
      {denied && <AccessModal close={() => setDenied(false)} />}{" "}
      {risk && riskModal && (
        <div className="modal-back">
          <div className="modal">
            <div
              className="passkey-icon"
              style={{ background: "#fff1d7", color: "var(--amber)" }}
            >
              <AlertTriangle />
            </div>
            <h2>Detectamos actividad inusual</h2>
            <p className="muted">
              El ritmo de revisión se aparta de tu actividad habitual. Confirma
              nuevamente tu identidad para continuar.
            </p>
            <div className="result-card" style={{ margin: "18px 0" }}>
              <div className="result-grid">
                <div>
                  <span>Señal detectada</span>
                  <b>{riskReason}</b>
                </div>
                <div>
                  <span>Dirección IP</span>
                  <b>203.0.113.42</b>
                </div>
                <div>
                  <span>Dispositivo</span>
                  <b>Windows PC · Edge</b>
                </div>
                <div>
                  <span>Nivel de riesgo</span>
                  <b style={{ color: "var(--amber)" }}>Elevado</b>
                </div>
              </div>
            </div>
            <button
              className="btn primary"
              style={{ width: "100%" }}
              onClick={() => setRiskModal(false)}
            >
              <Fingerprint size={18} /> Confirmar con Passkey
            </button>
            <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>
              El sistema detecta riesgo, no determina la identidad de una
              persona.
            </p>
          </div>
        </div>
      )}
      <DemoControl
        role={role}
        setRole={setRole}
        risk={risk}
        setRisk={setRisk}
        go={setScreen}
      />
    </div>
  );
}
