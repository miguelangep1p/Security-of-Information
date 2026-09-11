import type { QueueItem } from "@/lib/types";

export const queue: QueueItem[] = [
  {
    id: "q-1",
    patient: "Lucía Torres Vega",
    document: "Receta HC-2026-00182",
    status: "enviado",
    receivedAt: "Hoy · 09:10",
  },
  {
    id: "q-2",
    patient: "Mateo Ríos Luna",
    document: "Receta HC-2026-00183",
    status: "analizando",
    receivedAt: "Hoy · 09:41",
  },
  {
    id: "q-3",
    patient: "Rosa Delgado Núñez",
    document: "Nota de evolución 12",
    status: "recibido",
    receivedAt: "Hoy · 10:18",
  },
];
