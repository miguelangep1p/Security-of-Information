"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import {
  changeProfessionalRole,
  enqueue,
  getServerSnapshot,
  getSnapshot,
  loginSession,
  loginUser,
  logoutUser,
  registerProfessional,
  setAccessStatus,
  setAlert,
  setQueueStatus,
  setSystem,
  subscribe,
} from "@/lib/mock/client-store";
import { homePath } from "@/lib/mock/session";
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
import type { MockStoreData } from "@/lib/mock/store";

type MockContextValue = {
  ready: boolean;
  session: Session | null;
  store: MockStoreData;
  login: (userId: string) => Session | null;
  loginAs: (session: Session) => void;
  logout: () => void;
  registerProfessional: (input: Omit<Professional, "id" | "status">) => void;
  changeProfessionalRole: (id: string, role: Role) => void;
  setAlert: (id: string, patch: { status?: AlertStatus; assignee?: string }) => void;
  setAccessStatus: (id: string, status: AccessRequest["status"]) => void;
  enqueue: (item: Omit<QueueItem, "id">) => void;
  setQueueStatus: (id: string, status: QueueStatus) => void;
  setSystem: (patch: Partial<SystemStatus>) => void;
};

const MockContext = createContext<MockContextValue | null>(null);

export function MockProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<MockContextValue>(
    () => ({
      ready: true,
      session: state.session,
      store: state.store,
      login: loginUser,
      loginAs: loginSession,
      logout: logoutUser,
      registerProfessional,
      changeProfessionalRole,
      setAlert,
      setAccessStatus,
      enqueue,
      setQueueStatus,
      setSystem,
    }),
    [state],
  );

  return <MockContext.Provider value={value}>{children}</MockContext.Provider>;
}

export function useMock() {
  const context = useContext(MockContext);
  if (!context) throw new Error("useMock debe usarse dentro de MockProvider");
  return context;
}

export { homePath };
