import type { Role } from "@/lib/types";

// Solo navegación: la autorización real la aplica cada Route Handler con requireRole().
const roleRoutes: Record<Role, string[]> = {
  MÉDICO: ["/inicio", "/revision", "/historial", "/seguridad"],
  ADMIN: ["/inicio", "/profesionales", "/roles", "/configuracion", "/auditoria", "/alertas", "/accesos"],
  DIGITALIZADOR: ["/digitalizar", "/pendientes", "/historial"],
};

export function canAccess(role: Role, href: string) {
  return roleRoutes[role].some((route) => href === route || href.startsWith(`${route}/`));
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
