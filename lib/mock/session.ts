import type { Role, Session, User } from "@/lib/types";

export const SESSION_KEY = "nexo-session";
export const STORE_KEY = "nexo-mock-store";

export function toSession(user: User): Session {
  return {
    userId: user.id,
    name: user.name,
    shortName: user.shortName,
    initials: user.initials,
    role: user.role,
    email: user.email,
    institution: user.institution,
    cmp: user.cmp,
    membershipStatus: "Habilitado",
  };
}

export function homePath(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/profesionales";
    case "DIGITALIZADOR":
      return "/digitalizar";
    default:
      return "/inicio";
  }
}

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
}
