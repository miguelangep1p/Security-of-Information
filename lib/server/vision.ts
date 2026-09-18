import "server-only";

const PRESCRIPTION_FIELDS = ["medication", "dose", "frequency", "duration"] as const;
type PrescriptionField = (typeof PRESCRIPTION_FIELDS)[number];

const DOCUMENT_KINDS = ["Receta", "Nota de evolución", "Otro"] as const;
type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type PrescriptionExtraction = {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  confidence: number;
  lowConfidenceFields: PrescriptionField[];
};

export type MigrationExtraction = PrescriptionExtraction & {
  patientName: string;
  patientDni: string;
  documentKind: DocumentKind;
  noteSummary: string;
};

function isPrescriptionField(value: unknown): value is PrescriptionField {
  return (PRESCRIPTION_FIELDS as readonly unknown[]).includes(value);
}

function isDocumentKind(value: unknown): value is DocumentKind {
  return (DOCUMENT_KINDS as readonly unknown[]).includes(value);
}

function toPrescription(parsed: Record<string, unknown>): PrescriptionExtraction {
  return {
    medication: String(parsed.medication ?? ""),
    dose: String(parsed.dose ?? ""),
    frequency: String(parsed.frequency ?? ""),
    duration: String(parsed.duration ?? ""),
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
    lowConfidenceFields: Array.isArray(parsed.lowConfidenceFields)
      ? parsed.lowConfidenceFields.filter(isPrescriptionField)
      : [],
  };
}

// Un solo fetch a Gemini, con el schema/prompt que le pase cada llamador. Sin GEMINI_API_KEY,
// o ante cualquier falla de red/parseo, devuelve null: el llamador cae al flujo manual.
async function callGemini(prompt: string, responseSchema: object, bytes: Buffer, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: bytes.toString("base64") } }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", responseSchema },
      }),
    });
  } catch (error) {
    console.error("[nexo] Gemini no respondió", error);
    return null;
  }

  if (!response.ok) {
    console.error("[nexo] Gemini devolvió un error", response.status, await response.text().catch(() => ""));
    return null;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    console.error("[nexo] No se pudo interpretar la respuesta de Gemini", error, text);
    return null;
  }
}

const PRESCRIPTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    medication: { type: "STRING" },
    dose: { type: "STRING" },
    frequency: { type: "STRING" },
    duration: { type: "STRING" },
    confidence: { type: "INTEGER" },
    lowConfidenceFields: {
      type: "ARRAY",
      items: { type: "STRING", enum: [...PRESCRIPTION_FIELDS] },
    },
  },
  required: ["medication", "dose", "frequency", "duration", "confidence", "lowConfidenceFields"],
};

const PRESCRIPTION_PROMPT = `Eres un asistente que transcribe recetas médicas peruanas (manuscritas o impresas) para un sistema clínico.

De la imagen adjunta, extrae el medicamento principal recetado con estos campos:
- medication: nombre del medicamento (y presentación si aparece, ej. "Amoxicilina 500mg")
- dose: dosis (ej. "1 tableta", "500 mg")
- frequency: frecuencia (ej. "cada 8 horas")
- duration: duración del tratamiento (ej. "7 días")

Si el documento no es una receta, o no puedes leer alguno de estos campos con confianza razonable,
deja ese campo como cadena vacía "" y agrega su nombre a lowConfidenceFields.
confidence es tu confianza global (0 a 100) en la extracción completa.
Responde solo con el JSON pedido, sin explicaciones.`;

// Sin GEMINI_API_KEY el llamador cae de vuelta al flujo manual (revisión médica desde cero).
export async function extractPrescription(bytes: Buffer, mimeType: string): Promise<PrescriptionExtraction | null> {
  const parsed = await callGemini(PRESCRIPTION_PROMPT, PRESCRIPTION_SCHEMA, bytes, mimeType);
  return parsed ? toPrescription(parsed) : null;
}

const MIGRATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    patientName: { type: "STRING" },
    patientDni: { type: "STRING" },
    documentKind: { type: "STRING", enum: [...DOCUMENT_KINDS] },
    medication: { type: "STRING" },
    dose: { type: "STRING" },
    frequency: { type: "STRING" },
    duration: { type: "STRING" },
    noteSummary: { type: "STRING" },
    confidence: { type: "INTEGER" },
    lowConfidenceFields: {
      type: "ARRAY",
      items: { type: "STRING", enum: [...PRESCRIPTION_FIELDS] },
    },
  },
  required: [
    "patientName",
    "patientDni",
    "documentKind",
    "medication",
    "dose",
    "frequency",
    "duration",
    "noteSummary",
    "confidence",
    "lowConfidenceFields",
  ],
};

const MIGRATION_PROMPT = `Eres un asistente que digitaliza actas médicas peruanas (recetas, notas de evolución u otros
documentos clínicos, manuscritos o impresos) para migrarlas desde un archivo físico a un sistema clínico.

De la imagen adjunta, extrae:
- patientName: nombre completo del paciente tal como aparece en el documento (cadena vacía si no es legible)
- patientDni: DNI del paciente, 8 dígitos (cadena vacía si no aparece o no es legible)
- documentKind: "Receta" si es una receta médica, "Nota de evolución" si es una nota clínica de evolución
  o consulta, "Otro" para cualquier otro tipo de documento
- Si documentKind es "Receta", además el medicamento principal recetado: medication (nombre y presentación,
  ej. "Amoxicilina 500mg"), dose (ej. "1 tableta"), frequency (ej. "cada 8 horas"), duration (ej. "7 días").
  Si documentKind no es "Receta", deja estos cuatro campos como cadena vacía "".
- Si documentKind es "Nota de evolución" u "Otro", además: noteSummary con la transcripción completa
  del texto clínico del documento. Si documentKind es "Receta", deja noteSummary como cadena vacía "".

Si no puedes leer alguno de los campos medication/dose/frequency/duration con confianza razonable
(incluido el caso en que el documento no es una receta), deja ese campo como cadena vacía "" y agrega
su nombre a lowConfidenceFields.
confidence es tu confianza global (0 a 100) en la extracción completa.
Responde solo con el JSON pedido, sin explicaciones.`;

export async function extractMigrationFields(bytes: Buffer, mimeType: string): Promise<MigrationExtraction | null> {
  const parsed = await callGemini(MIGRATION_PROMPT, MIGRATION_SCHEMA, bytes, mimeType);
  if (!parsed) return null;
  return {
    ...toPrescription(parsed),
    patientName: String(parsed.patientName ?? ""),
    patientDni: String(parsed.patientDni ?? ""),
    documentKind: isDocumentKind(parsed.documentKind) ? parsed.documentKind : "Otro",
    noteSummary: String(parsed.noteSummary ?? ""),
  };
}
