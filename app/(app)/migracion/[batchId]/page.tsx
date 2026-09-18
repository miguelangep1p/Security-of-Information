"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { TableSkeleton } from "@/components/Skeleton";
import { api, useApi } from "@/lib/client/api";
import type { MigrationItem, MigrationItemStatus, PatientMatch } from "@/lib/types";

const MAX_BYTES = 4 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 3;

const statusLabel: Record<MigrationItemStatus, string> = {
  pendiente: "Sin analizar",
  analizado: "Analizado",
  vinculado: "Vinculado",
  creado: "Paciente creado",
  descartado: "Descartado",
};

const statusClass: Record<MigrationItemStatus, string> = {
  pendiente: "warn",
  analizado: "warn",
  vinculado: "ok",
  creado: "ok",
  descartado: "bad",
};

export default function MigracionBatchPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const items = useApi<{ items: MigrationItem[] }>(`/api/migraciones/${batchId}/items`);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<MigrationItem | null>(null);
  const list = items.data?.items ?? [];

  // Sube en paralelo acotado (3-4 a la vez): cada subida llama a Gemini de forma síncrona en el
  // servidor, igual que /digitalizar hoy, así que lanzar todo el lote de una satura al motor.
  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const all = Array.from(files);
    const oversized = all.some((file) => file.size > MAX_BYTES);
    setUploadError(oversized ? "Cada archivo debe pesar como máximo 4 MB. Se omitieron los que superan el límite." : null);
    const queue = all.filter((file) => file.size <= MAX_BYTES);
    if (queue.length === 0) return;

    setUploading(true);
    const worker = async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) break;
        const form = new FormData();
        form.append("file", file);
        try {
          await api(`/api/migraciones/${batchId}/items`, { body: form });
        } catch (e) {
          setUploadError((e as Error).message);
        }
        items.reload();
      }
    };
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
    setUploading(false);
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Lote de migración</h1>
          <p className="muted">Sube las actas del lote y confirma a qué paciente pertenece cada una.</p>
        </div>
      </div>

      <div
        className={`upload-zone${dragOver ? " drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
      >
        <div className="upload-zone-inner">
          <div className="upload-zone-icon">
            <UploadCloud size={26} />
          </div>
          <h2>Arrastra varias actas o haz clic para buscarlas</h2>
          <p className="muted">Se suben en paralelo; puedes seguir agregando mientras confirmas las anteriores.</p>
          <div className="upload-formats">
            <span className="format-chip">PDF</span>
            <span className="format-chip">JPG</span>
            <span className="format-chip">PNG</span>
          </div>
          <label className="btn secondary" style={{ display: "inline-flex", cursor: "pointer" }}>
            {uploading ? "Subiendo…" : "Buscar archivos"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => {
                uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>
            Máximo 4 MB por archivo
          </p>
        </div>
      </div>

      <ErrorNote message={items.error ?? uploadError} />

      <div className="panel">
        {items.loading && list.length === 0 ? (
          <TableSkeleton columns={5} />
        ) : list.length === 0 ? (
          <div className="empty">Todavía no subiste actas a este lote.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Paciente (OCR)</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id}>
                  <td>{item.filename}</td>
                  <td>
                    {item.ocrPatientName || "—"}
                    {item.ocrPatientDni ? (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {item.ocrPatientDni}
                      </div>
                    ) : null}
                  </td>
                  <td>{item.ocrDocumentKind || "—"}</td>
                  <td>
                    <span className={`badge ${statusClass[item.status]}`}>{statusLabel[item.status]}</span>
                  </td>
                  <td>
                    {(item.status === "pendiente" || item.status === "analizado") && (
                      <button className="btn primary" onClick={() => setActiveItem(item)}>
                        Confirmar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {activeItem && (
        <ConfirmModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onDone={() => {
            setActiveItem(null);
            items.reload();
          }}
        />
      )}
    </>
  );
}

function ConfirmModal({ item, onClose, onDone }: { item: MigrationItem; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<"vincular" | "crear">(item.suggestedPatient ? "vincular" : "crear");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientMatch[]>(item.suggestedPatient ? [item.suggestedPatient] : []);
  const [selectedId, setSelectedId] = useState(item.suggestedPatient?.id ?? "");
  const [fullName, setFullName] = useState(item.ocrPatientName ?? "");
  const [dni, setDni] = useState(item.ocrPatientDni ?? "");
  const [birthDate, setBirthDate] = useState("");
  const [recordNumber, setRecordNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setBusy(true);
    setError(null);
    try {
      const found = await api<{ patients: PatientMatch[] }>(`/api/pacientes?query=${encodeURIComponent(query)}`);
      setResults(found.patients);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "vincular") {
        if (!selectedId) throw new Error("Selecciona un paciente.");
        await api(`/api/migraciones/items/${item.id}`, {
          method: "PATCH",
          body: { type: "vincular", patientId: selectedId },
        });
      } else {
        await api(`/api/migraciones/items/${item.id}`, {
          method: "PATCH",
          body: {
            type: "crear",
            patient: { fullName, dni: dni || undefined, birthDate: birthDate || undefined },
            recordNumber: recordNumber || undefined,
          },
        });
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const discard = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/migraciones/items/${item.id}`, { method: "PATCH", body: { type: "descartar" } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-back">
      <div className="modal">
        <h2>{item.filename}</h2>
        <p className="muted">
          OCR propuso: {item.ocrPatientName || "sin nombre legible"}
          {item.ocrPatientDni ? ` · DNI ${item.ocrPatientDni}` : ""}
        </p>
        <ErrorNote message={error} />

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            className={mode === "vincular" ? "btn primary" : "btn secondary"}
            onClick={() => setMode("vincular")}
          >
            Vincular a paciente
          </button>
          <button className={mode === "crear" ? "btn primary" : "btn secondary"} onClick={() => setMode("crear")}>
            Crear paciente nuevo
          </button>
        </div>

        {mode === "vincular" ? (
          <>
            <div className="field">
              <label>Buscar por nombre o DNI</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o DNI" />
                <button className="btn secondary" disabled={busy} onClick={search}>
                  Buscar
                </button>
              </div>
            </div>
            <div className="field">
              <label>Paciente</label>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">Selecciona un paciente</option>
                {results.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} {patient.dni ? `· ${patient.dni}` : ""}
                    {patient.hasRecordHere ? "" : " (historia nueva en esta institución)"}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Nombre completo</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label>DNI</label>
              <input value={dni} onChange={(e) => setDni(e.target.value)} maxLength={8} />
            </div>
            <div className="field">
              <label>Fecha de nacimiento (opcional)</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="field">
              <label>N° de historia clínica (opcional, se genera si lo dejas en blanco)</label>
              <input
                value={recordNumber}
                onChange={(e) => setRecordNumber(e.target.value)}
                placeholder="HC-2026-00221"
              />
            </div>
          </>
        )}

        <button
          className="btn primary"
          style={{ width: "100%", marginTop: 8 }}
          disabled={busy || (mode === "vincular" ? !selectedId : !fullName.trim())}
          onClick={confirm}
        >
          {busy
            ? "Confirmando…"
            : mode === "vincular"
              ? "Vincular y enviar a revisión"
              : "Crear paciente y enviar a revisión"}
        </button>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="btn ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="btn ghost" disabled={busy} onClick={discard}>
            Descartar acta
          </button>
        </div>
      </div>
    </div>
  );
}
