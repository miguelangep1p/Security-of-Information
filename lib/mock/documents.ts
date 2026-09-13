import type { ClinicalDoc } from "@/lib/types";

export const documents: ClinicalDoc[] = [
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
    id: "HC-2026-00185",
    patient: "Tomás Silva Paz",
    med: "Omeprazol",
    dose: "20 mg",
    freq: "Antes del desayuno",
    duration: "14 días",
    confidence: 96,
    restricted: true,
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
];
