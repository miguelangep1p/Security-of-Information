import type {
  AccessRequest,
  AlertStatus,
  Professional,
  QueueItem,
  QueueStatus,
  Role,
  Session,
  SystemStatus,
} from "@/lib/types";
import {
  addProfessional,
  addQueueItem,
  defaultStore,
  readStore,
  updateAccessRequest,
  updateAlert,
  updateProfessionalRole,
  updateQueueStatus,
  writeStore,
  type MockStoreData,
} from "@/lib/mock/store";
import { readSession, writeSession } from "@/lib/mock/session";
import { getUser } from "@/lib/mock/users";
import { toSession } from "@/lib/mock/session";

export type ClientState = {
  session: Session | null;
  store: MockStoreData;
};

const listeners = new Set<() => void>();
let cache: ClientState | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ClientState {
  if (!cache) {
    cache = { session: readSession(), store: readStore() };
  }
  return cache;
}

const SERVER_SNAPSHOT: ClientState = {
  session: null,
  store: defaultStore(),
};

export function getServerSnapshot(): ClientState {
  return SERVER_SNAPSHOT;
}

function commit(next: ClientState) {
  cache = next;
  writeSession(next.session);
  writeStore(next.store);
  emit();
}

export function loginUser(userId: string) {
  const user = getUser(userId);
  if (!user) return null;
  const session = toSession(user);
  commit({ ...getSnapshot(), session });
  return session;
}

export function loginSession(session: Session) {
  commit({ ...getSnapshot(), session });
}

export function logoutUser() {
  commit({ ...getSnapshot(), session: null });
}

export function mutateStore(updater: (store: MockStoreData) => MockStoreData) {
  const current = getSnapshot();
  commit({ ...current, store: updater(current.store) });
}

export function registerProfessional(input: Omit<Professional, "id" | "status">) {
  mutateStore((store) => addProfessional(store, input));
}

export function changeProfessionalRole(id: string, role: Role) {
  mutateStore((store) => updateProfessionalRole(store, id, role));
}

export function setAlert(id: string, patch: { status?: AlertStatus; assignee?: string }) {
  mutateStore((store) => updateAlert(store, id, patch));
}

export function setAccessStatus(id: string, status: AccessRequest["status"]) {
  mutateStore((store) => updateAccessRequest(store, id, status));
}

export function enqueue(item: Omit<QueueItem, "id">) {
  mutateStore((store) => addQueueItem(store, item));
}

export function setQueueStatus(id: string, status: QueueStatus) {
  mutateStore((store) => updateQueueStatus(store, id, status));
}

export function setSystem(patch: Partial<SystemStatus>) {
  mutateStore((store) => ({ ...store, system: { ...store.system, ...patch } }));
}
