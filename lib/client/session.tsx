"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, UNAUTHORIZED_EVENT } from "@/lib/client/api";
import type { Session } from "@/lib/types";

type SessionContextValue = {
  ready: boolean;
  session: Session | null;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ ready: boolean; session: Session | null }>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    let active = true;
    // Si el usuario inicia sesión antes de que responda /me, no se pisa la sesión nueva.
    const settle = (session: Session | null) => {
      if (active) setState((previous) => (previous.ready ? previous : { ready: true, session }));
    };
    api<{ session: Session | null }>("/api/auth/me").then(
      ({ session }) => settle(session),
      () => settle(null),
    );

    const onUnauthorized = () => setState({ ready: true, session: null });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  const setSession = useCallback((session: Session | null) => setState({ ready: true, session }), []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setState({ ready: true, session: null });
  }, []);

  const value = useMemo(() => ({ ...state, setSession, logout }), [state, setSession, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession debe usarse dentro de SessionProvider");
  return context;
}
