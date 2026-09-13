import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  FileCheck2,
  Home,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navByRole: Record<Role, NavItem[]> = {
  MÉDICO: [
    { label: "Inicio", href: "/inicio", icon: Home },
    { label: "Revisión", href: "/revision", icon: ClipboardCheck },
    { label: "Historial", href: "/historial", icon: FileCheck2 },
    { label: "Seguridad", href: "/seguridad", icon: ShieldCheck },
  ],
  ADMIN: [
    { label: "Inicio", href: "/inicio", icon: Home },
    { label: "Profesionales", href: "/profesionales", icon: Users },
    { label: "Roles", href: "/roles", icon: LockKeyhole },
    { label: "Configuración", href: "/configuracion", icon: Activity },
  ],
  AUDITOR: [
    { label: "Auditoría", href: "/auditoria", icon: ClipboardCheck },
    { label: "Alertas", href: "/alertas", icon: AlertTriangle },
    { label: "Accesos excepcionales", href: "/accesos", icon: LockKeyhole },
  ],
  DIGITALIZADOR: [
    { label: "Digitalizar", href: "/digitalizar", icon: ScanLine },
    { label: "Pendientes", href: "/pendientes", icon: Upload },
    { label: "Historial", href: "/historial", icon: FileCheck2 },
  ],
};

export const roleLabel: Record<Role, string> = {
  MÉDICO: "Médico",
  ADMIN: "Administrador",
  AUDITOR: "Auditor",
  DIGITALIZADOR: "Digitalizador",
};
