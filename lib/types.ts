export type Role = "MÉDICO" | "ADMIN" | "AUDITOR" | "DIGITALIZADOR";

export type User = {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  role: Role;
  email: string;
  institution: string;
  cmp?: string;
  specialty?: string;
  rne?: string;
  council?: string;
};

export type MembershipStatus = "Habilitado" | "Pendiente" | "Suspendido";

export type Session = {
  userId: string;
  name: string;
  shortName: string;
  initials: string;
  role: Role;
  email: string;
  institution: string;
  cmp?: string;
  membershipStatus: MembershipStatus;
};

export type ClinicalDoc = {
  id: string;
  patient: string;
  med: string;
  dose: string;
  freq: string;
  duration: string;
  confidence: number;
  low?: "med" | "dose" | "freq" | "duration";
  restricted?: boolean;
};

export type Professional = {
  id: string;
  userId?: string;
  email?: string;
  name: string;
  cmp: string;
  institution: string;
  role: Role;
  status: MembershipStatus;
};

export type AuditResult = "ALLOW" | "DENY" | "REVIEW";

export type AuditEvent = {
  id: string;
  time: string;
  user: string;
  action: string;
  resource: string;
  result: AuditResult;
  cmp?: string;
  riskScore: number;
  auth: string;
  ip: string;
};

export type AlertSeverity = "alta" | "media" | "baja";
export type AlertStatus = "abierta" | "en revisión" | "cerrada";

export type AlertItem = {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
  status: AlertStatus;
  time: string;
  assignee?: string;
};

export type AccessStatus = "pendiente" | "vigente" | "vencido" | "denegado";

export type AccessRequest = {
  id: string;
  requester: string;
  patient: string;
  recordId: string;
  reason: string;
  justification: string;
  status: AccessStatus;
  requestedAt: string;
  window: string;
  expiresAt?: string | null;
};

export type AccessReason = "Emergencia médica" | "Atención no programada" | "Otro";

export type QueueStatus = "recibido" | "analizando" | "enviado";

export type QueueItem = {
  id: string;
  patient: string;
  document: string;
  status: QueueStatus;
  receivedAt: string;
};

export type RoleDefinition = {
  role: Role;
  label: string;
  description: string;
  permissions: {
    reviewClinical: boolean;
    approveClinical: boolean;
    digitize: boolean;
    viewAudit: boolean;
    manageUsers: boolean;
  };
};

export type SystemStatus = {
  ai: boolean;
  risk: boolean;
};

// ─── Respuestas de la API ───────────────────────────────────────────────────
// Las fechas llegan como cadenas ISO 8601.

export type ReviewField = "med" | "dose" | "freq" | "duration";

export type ReviewItem = {
  versionId: string;
  documentId: string;
  recordId: string;
  recordNumber: string;
  patient: string | null;
  med: string;
  dose: string;
  freq: string;
  duration: string;
  confidence: number | null;
  lowFields: ReviewField[];
  restricted: boolean;
  sentAt: string;
};

export type ReviewQueue = { items: ReviewItem[]; approvedToday: number };

export type HistoryVersion = {
  version: number;
  origin: "IA" | "MÉDICO";
  status: "pendiente" | "aprobada";
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByCmp: string | null;
  approvalMethod: string | null;
  contentHash: string | null;
};

export type HistoryDocument = {
  id: string;
  title: string;
  recordNumber: string;
  patient: string;
  originalHash: string;
  integrityVerified: boolean;
  current: HistoryVersion;
  versions: HistoryVersion[];
};

export type ClinicalRecordOption = { id: string; recordNumber: string; patient: string };

export type Institution = { id: string; name: string; kind?: string; city?: string };

export type ServiceStatus = {
  service: string;
  label: string;
  operational: boolean;
  updatedAt: string;
};

export type ActivityItem = {
  id: string;
  action: string;
  resource: string;
  result: AuditResult;
  occurredAt: string;
};

export type SessionInfo = {
  id: string;
  current: boolean;
  authMethod: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
};

export type PasskeyInfo = {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type SecurityOverview = {
  sessions: SessionInfo[];
  passkeys: PasskeyInfo[];
  activity: ActivityItem[];
};
