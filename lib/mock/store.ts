import type {
  AccessRequest,
  AlertItem,
  AlertStatus,
  AuditEvent,
  Professional,
  QueueItem,
  QueueStatus,
  Role,
  SystemStatus,
} from "@/lib/types";
import { accessRequests as seedAccess } from "@/lib/mock/access-requests";
import { alerts as seedAlerts } from "@/lib/mock/alerts";
import { auditEvents as seedAudit } from "@/lib/mock/audit";
import { professionals as seedProfessionals } from "@/lib/mock/professionals";
import { queue as seedQueue } from "@/lib/mock/queue";
import { STORE_KEY } from "@/lib/mock/session";

export type MockStoreData = {
  professionals: Professional[];
  alerts: AlertItem[];
  accessRequests: AccessRequest[];
  queue: QueueItem[];
  auditEvents: AuditEvent[];
  system: SystemStatus;
};

export const defaultStore = (): MockStoreData => ({
  professionals: seedProfessionals,
  alerts: seedAlerts,
  accessRequests: seedAccess,
  queue: seedQueue,
  auditEvents: seedAudit,
  system: { ai: true, risk: true },
});

export function readStore(): MockStoreData {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return defaultStore();
    return { ...defaultStore(), ...JSON.parse(raw) } as MockStoreData;
  } catch {
    return defaultStore();
  }
}

export function writeStore(store: MockStoreData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function addProfessional(
  store: MockStoreData,
  input: Omit<Professional, "id" | "status">,
): MockStoreData {
  return {
    ...store,
    professionals: [
      {
        ...input,
        id: `p-${Date.now()}`,
        status: "Pendiente",
      },
      ...store.professionals,
    ],
  };
}

export function updateProfessionalRole(
  store: MockStoreData,
  id: string,
  role: Role,
): MockStoreData {
  return {
    ...store,
    professionals: store.professionals.map((item) =>
      item.id === id ? { ...item, role } : item,
    ),
  };
}

export function updateAlert(
  store: MockStoreData,
  id: string,
  patch: { status?: AlertStatus; assignee?: string },
): MockStoreData {
  return {
    ...store,
    alerts: store.alerts.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  };
}

export function updateAccessRequest(
  store: MockStoreData,
  id: string,
  status: AccessRequest["status"],
): MockStoreData {
  return {
    ...store,
    accessRequests: store.accessRequests.map((item) =>
      item.id === id ? { ...item, status } : item,
    ),
  };
}

export function addQueueItem(
  store: MockStoreData,
  item: Omit<QueueItem, "id">,
): MockStoreData {
  return {
    ...store,
    queue: [{ ...item, id: `q-${Date.now()}` }, ...store.queue],
  };
}

export function updateQueueStatus(
  store: MockStoreData,
  id: string,
  status: QueueStatus,
): MockStoreData {
  return {
    ...store,
    queue: store.queue.map((item) =>
      item.id === id ? { ...item, status } : item,
    ),
  };
}
