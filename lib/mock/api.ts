import { documents } from "@/lib/mock/documents";
import { roleDefinitions } from "@/lib/mock/roles";
import { users } from "@/lib/mock/users";
import type { Role } from "@/lib/types";

export function listUsers() {
  return users;
}

export function listDocuments() {
  return documents;
}

export function listRoles() {
  return roleDefinitions;
}

const roleRoutes: Record<Role, string[]> = {
  MÉDICO: ["/inicio", "/revision", "/historial", "/seguridad"],
  ADMIN: ["/inicio", "/profesionales", "/roles", "/configuracion"],
  AUDITOR: ["/auditoria", "/alertas", "/accesos"],
  DIGITALIZADOR: ["/digitalizar", "/pendientes", "/historial"],
};

export function canAccess(role: Role, href: string) {
  return roleRoutes[role].some((route) => href === route || href.startsWith(`${route}/`));
}
