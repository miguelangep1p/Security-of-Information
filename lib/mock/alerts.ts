import type { AlertItem } from "@/lib/types";

export const alerts: AlertItem[] = [
  {
    id: "al-1",
    title: "Ritmo de revisión inusual",
    detail: "3 decisiones clínicas en menos de 4 segundos en la sesión 82A.",
    severity: "alta",
    status: "abierta",
    time: "10:30",
  },
  {
    id: "al-2",
    title: "Acceso de emergencia abierto",
    detail: "Ana Valdivia solicitó break-glass sobre HC-00209.",
    severity: "alta",
    status: "en revisión",
    time: "09:54",
    assignee: "Luis Paredes",
  },
  {
    id: "al-3",
    title: "Dispositivo nuevo verificado",
    detail: "Windows Hello se registró en un equipo no habitual.",
    severity: "media",
    status: "abierta",
    time: "28 ago",
  },
  {
    id: "al-4",
    title: "Motor de transcripción IA inestable",
    detail: "Se detectaron interrupciones intermitentes en el servicio de IA.",
    severity: "baja",
    status: "cerrada",
    time: "Ayer",
    assignee: "Rosa Huamán",
  },
];
