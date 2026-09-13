"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { SplitSkeleton, TableSkeleton } from "@/components/Skeleton";
import { useApi } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { authMethodLabel, formatWhen, shortHash } from "@/lib/format";
import type { HistoryDocument, HistoryVersion, QueueItem } from "@/lib/types";

function versionLabel(version: HistoryVersion, current: number) {
  if (version.status === "aprobada") {
    return version.version === current ? "Aprobada · Actual" : "Aprobada · Reemplazada";
  }
  return version.origin === "IA" ? "Transcripción IA · Pendiente" : "Corregida por médico · Pendiente";
}

export default function HistorialPage() {
  const { session } = useSession();
  const isDigitizer = session?.role === "DIGITALIZADOR";
  const sent = useApi<{ documents: QueueItem[] }>(isDigitizer ? "/api/documentos?estado=enviados" : null);
  const history = useApi<{ documents: HistoryDocument[] }>(session && !isDigitizer ? "/api/historial" : null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showImmutableNote, setShowImmutableNote] = useState(false);
  if (!session) return null;

  if (isDigitizer) {
    const documents = sent.data?.documents ?? [];
    return (
      <>
        <div className="pagehead">
          <div>
            <h1>Historial de digitalización</h1>
            <p className="muted">Documentos enviados a revisión médica.</p>
          </div>
        </div>
        <ErrorNote message={sent.error} />
        <div className="panel">
          {sent.loading && documents.length === 0 ? (
            <TableSkeleton columns={4} />
          ) : (
            <>
          <table className="table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Paciente</th>
                <th>Recibido</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((item) => (
                <tr key={item.id}>
                  <td>{item.document}</td>
                  <td>{item.patient}</td>
                  <td>{formatWhen(item.receivedAt)}</td>
                  <td>
                    <span className="badge ok">Enviado a revisión</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sent.loading && documents.length === 0 && (
            <div className="empty">Aún no enviaste documentos a revisión.</div>
          )}
            </>
          )}
        </div>
      </>
    );
  }

  const documents = history.data?.documents ?? [];
  const current = documents.find((document) => document.id === selectedId) ?? documents[0];

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Historial clínico</h1>
          <p className="muted">Versiones aprobadas y su trazabilidad.</p>
        </div>
        {documents.length > 1 && (
          <select value={current?.id} onChange={(e) => setSelectedId(e.target.value)}>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.recordNumber} · {document.patient}
              </option>
            ))}
          </select>
        )}
      </div>
      <ErrorNote message={history.error} />
      {!current ? (
        history.loading ? (
          <SplitSkeleton />
        ) : (
          <div className="panel" style={{ maxWidth: 700 }}>
            <div className="empty">Aún no hay documentos aprobados a los que tengas acceso.</div>
          </div>
        )
      ) : (
        <div className="review-layout">
          <div className="panel">
            <div className="panel-head">
              <b>{current.recordNumber}</b>
              <span className="badge ok">Aprobado</span>
            </div>
            <div className="transcription">
              <div className="result-grid" style={{ padding: 0 }}>
                {[
                  ["Paciente", current.patient],
                  ["Versión", String(current.current.version)],
                  ["Aprobado por", current.current.approvedBy ?? "—"],
                  ["CMP", current.current.approvedByCmp ?? "—"],
                  ["Fecha", formatWhen(current.current.approvedAt)],
                  ["Integridad", current.integrityVerified ? "✓ Verificada" : "✗ No coincide"],
                  ["Método", authMethodLabel[current.current.approvalMethod ?? ""] ?? "—"],
                  ["Hash original", shortHash(current.originalHash)],
                  ["Hash transcripción", shortHash(current.current.contentHash)],
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
              <button className="btn secondary" onClick={() => setShowImmutableNote(true)}>
                Crear nueva versión
              </button>
              {showImmutableNote && (
                <p className="muted" style={{ fontSize: 13 }}>
                  No puedes sobrescribir una versión aprobada. Las correcciones se hacen desde Revisión y
                  generan una versión nueva.
                </p>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <b>Versionado</b>
              <span className="badge">Inmutable</span>
            </div>
            <div className="transcription">
              <div className="timeline">
                {current.versions.map((version) => (
                  <div className="timeitem" key={version.version}>
                    <b>Versión {version.version}</b>
                    <div>
                      {versionLabel(version, current.current.version)} · {formatWhen(version.approvedAt ?? version.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
