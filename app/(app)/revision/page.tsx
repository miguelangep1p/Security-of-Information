"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { describeDevice, formatWhen } from "@/lib/format";
import type { AccessReason, AccessStatus, ReviewField, ReviewItem, ReviewQueue } from "@/lib/types";

const BATCH_SIZE = 3;

const FIELDS: [string, ReviewField][] = [
  ["Medicamento", "med"],
  ["Dosis", "dose"],
  ["Frecuencia", "freq"],
  ["Duración", "duration"],
];

const FIELD_TO_API: Record<ReviewField, string> = {
  med: "medication",
  dose: "dose",
  freq: "frequency",
  duration: "duration",
};

const howto = [
  {
    title: "Digitalización envía el documento",
    desc: "El escaneo llega con el texto ya extraído por OCR.",
  },
  {
    title: "La IA transcribe y estima su confianza",
    desc: "Marca los campos con baja confianza para que los verifiques.",
  },
  {
    title: "Tú comparas, corriges y validas",
    desc: "Confirmas con Passkey; la aprobación queda registrada en auditoría.",
  },
];

type Draft = Record<ReviewField, string>;
type Decision = { item: ReviewItem; corrected: Draft | null };
type Outcome = { ok: number; failed: { recordNumber: string; message: string }[] };

export default function RevisionPage() {
  const { session } = useSession();
  const router = useRouter();
  const queue = useApi<ReviewQueue>("/api/revision");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [summary, setSummary] = useState(false);
  const [stepup, setStepup] = useState<"closed" | "idle" | "loading" | "done">("closed");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [risk, setRisk] = useState(false);
  const [riskModal, setRiskModal] = useState(false);
  const [riskReason, setRiskReason] = useState("Dispositivo o patrón de uso no habitual");
  const decisionTimes = useRef<number[]>([]);

  const all = queue.data?.items ?? [];
  const handled = new Set([...decisions.map((decision) => decision.item.versionId), ...skipped]);
  const remaining = all.filter((item) => !handled.has(item.versionId));
  const d = remaining[0];

  const decide = (item: ReviewItem, corrected: Draft | null) => {
    const now = Date.now();
    decisionTimes.current = [...decisionTimes.current, now].filter((time) => now - time < 3000);
    if (decisionTimes.current.length >= 2 && !risk) {
      decisionTimes.current = [];
      const reason = "2 decisiones clínicas en menos de 3 segundos";
      setRisk(true);
      setRiskReason(reason);
      setRiskModal(true);
      api("/api/revision/anomalia", { body: { reason } }).catch(() => {});
    }
    const next = [...decisions, { item, corrected }];
    setDecisions(next);
    setDraft(null);
    if (next.length >= BATCH_SIZE || remaining.length <= 1) setSummary(true);
  };

  const skip = (item: ReviewItem) => {
    setSkipped((ids) => [...ids, item.versionId]);
    setDraft(null);
    if (remaining.length <= 1 && decisions.length > 0) setSummary(true);
  };

  const confirmValidations = async () => {
    setStepup("loading");
    const failed: Outcome["failed"] = [];
    let ok = 0;
    for (const { item, corrected } of decisions) {
      const corrections = corrected
        ? Object.fromEntries(FIELDS.map(([, key]) => [FIELD_TO_API[key], corrected[key]]))
        : undefined;
      try {
        await api(`/api/transcripciones/${item.versionId}/aprobar`, { body: { corrections } });
        ok += 1;
      } catch (error) {
        failed.push({ recordNumber: item.recordNumber, message: (error as Error).message });
      }
    }
    setOutcome({ ok, failed });
    setStepup("done");
  };

  const continueReviewing = () => {
    setDecisions([]);
    setSkipped([]);
    setSummary(false);
    setStepup("closed");
    setOutcome(null);
    queue.reload();
  };

  if (summary) {
    const fixed = decisions.filter((decision) => decision.corrected).length;
    const correct = decisions.length - fixed;
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
          <h2>{decisions.length} documentos revisados</h2>
          <div className="stats" style={{ marginTop: 22 }}>
            <div className="stat">
              <strong>{correct}</strong>Correctos
            </div>
            <div className="stat">
              <strong>{fixed}</strong>Corregidos
            </div>
            <div className="stat">
              <strong>{remaining.length}</strong>Pendientes en cola
            </div>
          </div>
          <button className="btn primary" onClick={() => setStepup("idle")}>
            Confirmar validaciones
          </button>
        </div>
        {stepup !== "closed" && (
          <div className="modal-back">
            <div className="modal">
              {stepup === "idle" && (
                <>
                  <div className="passkey-icon">
                    <Fingerprint size={34} />
                  </div>
                  <h2>Confirma que eres tú</h2>
                  <p className="muted">
                    Esta acción validará clínicamente los documentos revisados.
                  </p>
                  <button className="btn primary" style={{ width: "100%" }} onClick={confirmValidations}>
                    Confirmar con Windows Hello
                  </button>
                </>
              )}
              {stepup === "loading" && (
                <>
                  <div className="spinner" />
                  <h2 style={{ textAlign: "center" }}>Sellando validaciones…</h2>
                </>
              )}
              {stepup === "done" && outcome && (
                <>
                  <div className="passkey-icon">
                    {outcome.failed.length === 0 ? <Check size={35} /> : <AlertTriangle size={35} />}
                  </div>
                  <h2 style={{ textAlign: "center" }}>
                    {outcome.ok === 1 ? "1 documento validado" : `${outcome.ok} documentos validados`}
                  </h2>
                  {outcome.ok > 0 && (
                    <div className="verified">
                      <Check size={18} /> Versiones aprobadas y registradas en auditoría
                    </div>
                  )}
                  {outcome.failed.map((failure) => (
                    <ErrorNote key={failure.recordNumber} message={`${failure.recordNumber}: ${failure.message}`} />
                  ))}
                  <button
                    className="btn primary"
                    style={{ width: "100%" }}
                    onClick={() => router.push("/historial")}
                  >
                    Ver trazabilidad
                  </button>
                  <button className="btn ghost" style={{ width: "100%" }} onClick={continueReviewing}>
                    Continuar revisando
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  if (!d) {
    return (
      <>
        <div className="pagehead">
          <div>
            <h1>Revisión clínica</h1>
            <p className="muted">IA propone, tú decides.</p>
          </div>
        </div>
        <ErrorNote message={queue.error} />
        <div className="split-grid">
          <div className="panel">
            <div className="empty">
              {queue.loading ? (
                <p className="muted">Cargando cola de revisión…</p>
              ) : (
                <>
                  <div className="state-icon ok">
                    <Check size={26} />
                  </div>
                  <h2>No hay transcripciones pendientes</h2>
                  <p>Cuando Digitalización envíe documentos, aparecerán aquí para tu validación.</p>
                  <button className="btn secondary" onClick={continueReviewing}>
                    <RefreshCw size={16} /> Actualizar
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <b>Cómo funciona la revisión</b>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              {howto.map((s, i) => (
                <div className="howto-step" key={s.title}>
                  <div className="howto-step-num">{i + 1}</div>
                  <div>
                    <b style={{ fontSize: 13.5, display: "block", marginBottom: 2 }}>{s.title}</b>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {s.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const incomplete = FIELDS.some(([, key]) => !d[key].trim());

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Revisión clínica</h1>
          <p className="muted">
            Documento {handled.size + 1} de {all.length} · IA propone, tú decides.
          </p>
        </div>
        <div>
          <span className={`badge ${risk ? "warn" : "ok"}`}>
            {risk ? "Verificación requerida" : "Riesgo bajo"}
          </span>
          <span className="badge" style={{ marginLeft: 8 }}>
            {session?.institution}
          </span>
        </div>
      </div>
      <ErrorNote message={queue.error} />
      <div className="review-layout">
        <div className="panel">
          <div className="panel-head">
            <b>Documento original</b>
            <span className="badge">{d.restricted ? "Restringido" : "Escaneo"}</span>
          </div>
          <div className="scan">
            <h3>{session?.institution.toUpperCase()}</h3>
            {d.restricted ? (
              <p>Contenido protegido · {d.recordNumber}</p>
            ) : (
              <>
                <p>Paciente: {d.patient}</p>
                <p>Enviado: {formatWhen(d.sentAt)}</p>
                <hr />
                <p>Rp.</p>
                <p style={{ fontSize: 24, fontStyle: "italic" }}>{d.med || "—"}</p>
                <p>
                  {d.dose || "—"} — {d.freq || "—"}
                </p>
                <p>Durante {d.duration || "—"}</p>
              </>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <b>Transcripción IA</b>
              <div className="muted" style={{ fontSize: 12 }}>
                {d.recordNumber} · Requiere validación humana
              </div>
            </div>
            {!d.restricted && (
              <span className={`badge ${d.confidence ? "ok" : "warn"}`}>
                {d.confidence ? `Confianza ${d.confidence}%` : "Sin transcripción IA"}
              </span>
            )}
          </div>
          <div className="transcription">
            {FIELDS.map(([label, key]) => (
              <div className="trans-field" key={key}>
                <label>{label}</label>
                {draft ? (
                  <input
                    value={draft[key]}
                    autoFocus={key === (d.lowFields[0] ?? "med")}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 10,
                      border: `2px solid ${d.lowFields.includes(key) ? "var(--amber)" : "var(--teal)"}`,
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <b>{d[key] || "—"}</b>
                )}
                {d.lowFields.includes(key) && !draft && (
                  <span className="badge warn" style={{ float: "right" }}>
                    <AlertTriangle size={12} style={{ display: "inline" }} /> Verificar
                  </span>
                )}
              </div>
            ))}
            {!d.restricted &&
              (draft ? (
                <div className="review-actions">
                  <button className="btn ghost" onClick={() => setDraft(null)}>
                    Cancelar
                  </button>
                  <button
                    className="btn primary"
                    disabled={FIELDS.some(([, key]) => !draft[key].trim())}
                    onClick={() => decide(d, draft)}
                  >
                    <Check size={18} /> Guardar corrección
                  </button>
                </div>
              ) : (
                <div className="review-actions">
                  <button
                    className="btn secondary"
                    onClick={() => setDraft({ med: d.med, dose: d.dose, freq: d.freq, duration: d.duration })}
                  >
                    <ArrowLeft size={18} /> Corregir
                  </button>
                  <button
                    className="btn primary"
                    disabled={incomplete}
                    title={incomplete ? "Completa los campos con Corregir" : undefined}
                    onClick={() => decide(d, null)}
                  >
                    Correcto <ArrowRight size={18} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
      {d.restricted && !queue.loading && (
        <AccessModal key={d.versionId} item={d} onSkip={() => skip(d)} onGranted={queue.reload} />
      )}
      {risk && riskModal && (
        <div className="modal-back">
          <div className="modal">
            <div className="passkey-icon" style={{ background: "#fff1d7", color: "var(--amber)" }}>
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
                  <span>Profesional</span>
                  <b>{session?.shortName}</b>
                </div>
                <div>
                  <span>Dispositivo</span>
                  <b>{describeDevice(navigator.userAgent)}</b>
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
          </div>
        </div>
      )}
    </>
  );
}

function AccessModal({
  item,
  onSkip,
  onGranted,
}: {
  item: ReviewItem;
  onSkip: () => void;
  onGranted: () => void;
}) {
  const [emergency, setEmergency] = useState(false);
  const [auth, setAuth] = useState(false);
  const [reason, setReason] = useState<AccessReason>("Emergencia médica");
  const [justification, setJustification] = useState("Paciente requiere evaluación inmediata en emergencia.");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ status: AccessStatus }>("/api/accesos", {
        body: { recordId: item.recordId, reason, justification },
      });
      if (result.status === "vigente") onGranted();
      else setPending(true);
    } catch (e) {
      setError((e as Error).message);
      setAuth(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-back">
      <div className="modal">
        {pending ? (
          <>
            <div className="passkey-icon">
              <Check />
            </div>
            <h2>Solicitud enviada</h2>
            <p className="muted">
              Un auditor debe aprobar el acceso a {item.recordNumber}. Mientras tanto puedes continuar con otros documentos.
            </p>
            <button className="btn primary" style={{ width: "100%" }} onClick={onSkip}>
              Continuar
            </button>
          </>
        ) : !emergency ? (
          <>
            <div className="passkey-icon" style={{ background: "#fdeceb", color: "var(--red)" }}>
              <LockKeyhole />
            </div>
            <h2>No tienes acceso a esta historia clínica</h2>
            <p className="muted">
              No existe una relación asistencial activa con este paciente. Recurso {item.recordNumber}.
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
            <button className="btn secondary" onClick={onSkip}>
              Omitir documento
            </button>{" "}
            <button className="btn ghost" onClick={() => setEmergency(true)}>
              Solicitar acceso de emergencia
            </button>
          </>
        ) : !auth ? (
          <>
            <h2>Acceso de emergencia</h2>
            <p className="muted">
              Utiliza esta opción únicamente cuando el acceso inmediato sea necesario.
            </p>
            <ErrorNote message={error} />
            <div className="field">
              <label>Motivo obligatorio</label>
              <select value={reason} onChange={(e) => setReason(e.target.value as AccessReason)}>
                <option>Emergencia médica</option>
                <option>Atención no programada</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="field">
              <label>Justificación</label>
              <textarea value={justification} onChange={(e) => setJustification(e.target.value)} />
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              {reason === "Emergencia médica"
                ? "Se concede de inmediato por 2 horas y se alerta al auditor."
                : "Queda pendiente hasta que un auditor la apruebe."}
            </p>
            <button
              className="btn primary"
              style={{ width: "100%" }}
              disabled={justification.trim().length < 10}
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
            <p className="muted">Este acceso será temporal y el evento quedará auditado.</p>
            <button className="btn primary" style={{ width: "100%" }} disabled={busy} onClick={submit}>
              {busy ? "Registrando…" : "Confirmar con Passkey"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
