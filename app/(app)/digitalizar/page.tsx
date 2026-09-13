"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  FileText,
  LockKeyhole,
  ScanLine,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { ErrorNote } from "@/components/ErrorNote";
import { api, useApi } from "@/lib/client/api";
import { shortHash } from "@/lib/format";
import type { ClinicalRecordOption } from "@/lib/types";

const MAX_BYTES = 4 * 1024 * 1024;

const steps = [
  { label: "Documento recibido", icon: Upload },
  { label: "Analizando documento…", icon: ScanLine },
  { label: "Transcripción generada", icon: Sparkles },
  { label: "Enviado a revisión médica", icon: Send },
];

const howto = [
  {
    title: "Sube el escaneo o la foto",
    desc: "Acepta PDF, JPG o PNG. No necesitas editar ni recortar la imagen.",
  },
  {
    title: "La IA extrae el texto (OCR)",
    desc: "Identifica paciente, medicamento y datos clave de forma automática.",
  },
  {
    title: "Se envía a revisión médica",
    desc: "Tú no editas ni apruebas contenido clínico: eso lo decide el médico.",
  },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DigitalizarPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const records = useApi<{ records: ClinicalRecordOption[] }>("/api/historias");

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState(0);
  const [recordId, setRecordId] = useState("");
  const [uploaded, setUploaded] = useState<{ patient: string; sha256: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = records.data?.records ?? [];
  const selectedRecord = options.find((option) => option.id === recordId) ?? options[0];

  const handleFiles = (list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) return;
    setError(picked.size > MAX_BYTES ? "El archivo debe pesar como máximo 4 MB." : null);
    if (picked.size <= MAX_BYTES) setFile(picked);
  };

  const reset = () => {
    setFile(null);
    setPhase(0);
    setUploaded(null);
    setError(null);
  };

  // Cada paso es una llamada real: carga, análisis (IA simulada en el servidor) y envío a revisión.
  const startDigitizing = async () => {
    if (!file || !selectedRecord) return;
    setError(null);
    setPhase(1);
    try {
      const form = new FormData();
      form.append("recordId", selectedRecord.id);
      form.append("file", file);
      const created = await api<{ id: string; sha256: string }>("/api/documentos", { body: form });
      setUploaded({ patient: selectedRecord.patient, sha256: created.sha256 });
      setPhase(2);
      await api(`/api/documentos/${created.id}/estado`, { method: "PATCH", body: { status: "analizando" } });
      setPhase(3);
      await api(`/api/documentos/${created.id}/estado`, { method: "PATCH", body: { status: "enviado" } });
      setPhase(4);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Digitalizar documento</h1>
          <p className="muted">Carga el archivo para enviarlo a revisión médica.</p>
        </div>
      </div>

      <ErrorNote message={records.error} />

      <div className="split-grid">
        <div className="panel">
          <div style={{ padding: 22 }}>
            {!file && phase === 0 && (
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
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
              >
                <div className="upload-zone-inner">
                  <div className="upload-zone-icon">
                    <Upload size={26} />
                  </div>
                  <h2>Selecciona un documento clínico</h2>
                  <p className="muted">Arrastra el archivo aquí o haz clic para buscarlo</p>
                  <div className="upload-formats">
                    <span className="format-chip">PDF</span>
                    <span className="format-chip">JPG</span>
                    <span className="format-chip">PNG</span>
                  </div>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    Buscar archivo
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    hidden
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>
                    Máximo 4 MB
                  </p>
                </div>
              </div>
            )}

            {!file && phase === 0 && <ErrorNote message={error} />}

            {file && phase === 0 && (
              <>
                <div className="file-chip">
                  <div className="file-chip-icon">
                    <FileText size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b
                      style={{
                        display: "block",
                        fontSize: 13.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.name}
                    </b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="file-chip-remove"
                    onClick={() => setFile(null)}
                    aria-label="Quitar archivo"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="field">
                  <label>Historia clínica</label>
                  <select
                    value={selectedRecord?.id ?? ""}
                    onChange={(e) => setRecordId(e.target.value)}
                    disabled={records.loading}
                  >
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.recordNumber} · {option.patient}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn primary"
                  style={{ width: "100%" }}
                  disabled={!selectedRecord}
                  onClick={startDigitizing}
                >
                  <ScanLine size={18} /> Digitalizar documento
                </button>
              </>
            )}

            {phase > 0 && (
              <div>
                {steps.map((s, i) => {
                  const done = phase > i;
                  const active = phase === i + 1 && phase < 4 && !error;
                  return (
                    <div className={`process-step${done ? " done" : ""}${active ? " active" : ""}`} key={s.label}>
                      <div className="process-step-icon">
                        {done ? <Check size={16} /> : <s.icon size={16} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <b style={{ fontSize: 13.5, display: "block" }}>{s.label}</b>
                        {i === 0 && uploaded && (
                          <span className="muted" style={{ fontSize: 12 }}>
                            Paciente: {uploaded.patient} · SHA-256 {shortHash(uploaded.sha256)}
                          </span>
                        )}
                      </div>
                      {done ? (
                        <span className="badge ok">Listo</span>
                      ) : active ? (
                        <span className="badge warn">En curso</span>
                      ) : (
                        <span className="badge">Pendiente</span>
                      )}
                    </div>
                  );
                })}

                {error && (
                  <>
                    <ErrorNote message={error} />
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button className="btn secondary" onClick={reset}>
                        <Upload size={16} /> Intentar con otro documento
                      </button>
                      {uploaded && (
                        <button className="btn ghost" onClick={() => router.push("/pendientes")}>
                          Continuar en Pendientes <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </>
                )}

                {phase >= 4 && (
                  <>
                    <div className="verified" style={{ marginTop: 16 }}>
                      <LockKeyhole size={18} /> Enviado. El médico valida el contenido.
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button className="btn secondary" onClick={reset}>
                        <Upload size={16} /> Digitalizar otro documento
                      </button>
                      <button className="btn ghost" onClick={() => router.push("/historial")}>
                        Ver en historial <ArrowRight size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <b>Cómo funciona</b>
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
