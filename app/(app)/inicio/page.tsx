"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { useApi } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { actionLabel, formatToday, formatWhen } from "@/lib/format";
import type { ActivityItem, Professional, ReviewField, ReviewQueue } from "@/lib/types";

const fieldLabel: Record<ReviewField, string> = {
  med: "Medicamento",
  dose: "Dosis",
  freq: "Frecuencia",
  duration: "Duración",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function InicioPage() {
  const { session } = useSession();
  const router = useRouter();
  const isAdmin = session?.role === "ADMIN";
  const professionals = useApi<{ professionals: Professional[] }>(isAdmin ? "/api/profesionales" : null);
  const queue = useApi<ReviewQueue>(session?.role === "MÉDICO" ? "/api/revision" : null);
  const activity = useApi<{ activity: ActivityItem[] }>(session ? "/api/me/actividad" : null);
  if (!session) return null;

  if (isAdmin) {
    const list = professionals.data?.professionals ?? [];
    return (
      <>
        <div className="pagehead">
          <div>
            <p className="muted" style={{ margin: 0 }}>
              Administración operativa
            </p>
            <h1>Hola, {session.shortName.split(" ")[0]}.</h1>
            <p className="muted">Gestiona profesionales sin acceder a contenido clínico.</p>
          </div>
          <span className="badge ok">
            <ShieldCheck size={13} style={{ display: "inline" }} /> Sesión protegida
          </span>
        </div>
        <ErrorNote message={professionals.error} />
        <div className="stats">
          <div className="stat">
            <strong>{professionals.loading ? "…" : list.length}</strong>
            <span className="muted">Profesionales</span>
          </div>
          <div className="stat">
            <strong>{professionals.loading ? "…" : list.filter((p) => p.status === "Pendiente").length}</strong>
            <span className="muted">Pendientes de alta</span>
          </div>
          <div className="stat">
            <strong>
              {professionals.loading
                ? "…"
                : list.filter((p) => p.role === "MÉDICO" && p.status === "Habilitado").length}
            </strong>
            <span className="muted">Médicos habilitados</span>
          </div>
        </div>
        <div className="feature">
          <div>
            <div className="eyebrow">Tu tarea principal</div>
            <h2>Revisar altas profesionales</h2>
            <p className="muted">Este rol no puede revisar ni aprobar documentos clínicos.</p>
          </div>
          <button className="btn primary" onClick={() => router.push("/profesionales")}>
            Ver profesionales <ArrowRight size={18} />
          </button>
        </div>
      </>
    );
  }

  const items = queue.data?.items ?? [];
  const attentionDocs = items.filter((item) => item.restricted || item.lowFields.length > 0);
  const nextItem = items.find((item) => !item.restricted);
  const pendingText = queue.loading
    ? "Cargando tu cola de revisión…"
    : items.length === 1
      ? "Tienes 1 transcripción pendiente."
      : `Tienes ${items.length} transcripciones pendientes.`;

  return (
    <>
      <div className="pagehead">
        <div>
          <p className="muted" style={{ margin: 0 }}>
            {formatToday()}
          </p>
          <h1>
            {greeting()}, {session.shortName.split(" ")[0]}.
          </h1>
          <p className="muted">{pendingText}</p>
        </div>
        <span className="badge ok">
          <ShieldCheck size={13} style={{ display: "inline" }} /> Sesión protegida
        </span>
      </div>
      <ErrorNote message={queue.error} />
      <div className="stats">
        <div className="stat">
          <strong>{queue.loading ? "…" : items.length}</strong>
          <span className="muted">Pendientes de revisión</span>
        </div>
        <div className="stat">
          <strong>{queue.loading ? "…" : attentionDocs.length}</strong>
          <span className="muted">Requieren atención</span>
        </div>
        <div className="stat">
          <strong>{queue.loading ? "…" : (queue.data?.approvedToday ?? 0)}</strong>
          <span className="muted">Validadas hoy</span>
        </div>
      </div>
      <div className="feature">
        <div>
          <div className="eyebrow">Tu tarea principal</div>
          <h2>Revisar transcripciones clínicas</h2>
          <p className="muted">Compara el documento original con la propuesta de IA.</p>
        </div>
        <button className="btn primary" onClick={() => router.push("/revision")}>
          Comenzar revisión <ArrowRight size={18} />
        </button>
      </div>
      {nextItem && (
        <div className="subsection">
          <h2>Continuar donde lo dejaste</h2>
          <div className="listrow">
            <div>
              <b>Historia clínica {nextItem.recordNumber}</b>
              <div className="muted">{nextItem.patient}</div>
            </div>
            <button className="btn secondary" onClick={() => router.push("/revision")}>
              Continuar <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}

      <div className="review-layout" style={{ marginTop: 30 }}>
        <div className="panel">
          <div className="panel-head">
            <b>Documentos que requieren atención</b>
            <span className="badge warn">{attentionDocs.length} pendientes</span>
          </div>
          <div className="transcription">
            {attentionDocs.length === 0 && !queue.loading && (
              <p className="muted">No hay documentos que requieran atención.</p>
            )}
            {attentionDocs.map((doc) => (
              <div className="listrow" key={doc.versionId}>
                <div>
                  <b>{doc.recordNumber}</b>
                  <div className="muted">{doc.patient ?? "Paciente protegido"}</div>
                </div>
                <span className="badge warn">
                  {doc.restricted
                    ? "Acceso restringido"
                    : doc.lowFields.length > 1
                      ? `Verificar ${doc.lowFields.length} campos`
                      : `Verificar ${fieldLabel[doc.lowFields[0]!]}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <b>Actividad reciente</b>
          </div>
          <div className="transcription">
            {(activity.data?.activity ?? []).map((item) => (
              <div className="listrow" key={item.id}>
                <span>
                  {actionLabel[item.action] ?? item.action} · {item.resource}
                </span>
                <span className="muted">{formatWhen(item.occurredAt)}</span>
              </div>
            ))}
            {activity.data?.activity.length === 0 && <p className="muted">Sin actividad registrada.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
