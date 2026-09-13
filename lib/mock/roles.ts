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
    description: "Gestiona profesionales y configuración. Sin acceso clínico.",
    permissions: {
      reviewClinical: false,
      approveClinical: false,
      digitize: false,
      viewAudit: false,
      manageUsers: true,
    },
  },
  {
    role: "AUDITOR",
    label: "Auditor",
    description: "Supervisa trazabilidad, alertas y accesos excepcionales.",
    permissions: {
      reviewClinical: false,
      approveClinical: false,
      digitize: false,
      viewAudit: true,
      manageUsers: false,
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
