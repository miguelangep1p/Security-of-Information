import type { RoleDefinition } from "@/lib/types";

export const roleDefinitions: RoleDefinition[] = [
  {
    role: "MÉDICO",
    label: "Médico",
    description: "Revisa y valida transcripciones clínicas de sus pacientes.",
    permissions: {
      reviewClinical: true,
      approveClinical: true,
      digitize: false,
      viewAudit: false,
      manageUsers: false,
    },
  },
  {
    role: "ADMIN",
    label: "Administrador",
    description:
      "Gestiona profesionales y configuración; supervisa trazabilidad, alertas y accesos excepcionales.",
    permissions: {
      reviewClinical: false,
      approveClinical: false,
      digitize: false,
      viewAudit: true,
      manageUsers: true,
    },
  },
  {
    role: "DIGITALIZADOR",
    label: "Digitalizador",
    description: "Carga y prepara documentos. No puede aprobar.",
    permissions: {
      reviewClinical: false,
      approveClinical: false,
      digitize: true,
      viewAudit: false,
      manageUsers: false,
    },
  },
];
