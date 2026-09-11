const TIME_ZONE = "America/Lima";

const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);

// "Hoy · 09:10", "Ayer · 18:12" o "03 sep · 16:40", siempre en hora de Lima.
export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("es-PE", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const now = new Date();
  if (dayKey(date) === dayKey(now)) return `Hoy · ${time}`;
  if (dayKey(date) === dayKey(new Date(now.getTime() - 86_400_000))) return `Ayer · ${time}`;
  const day = new Intl.DateTimeFormat("es-PE", { timeZone: TIME_ZONE, day: "2-digit", month: "short" })
    .format(date)
    .replace(".", "");
  return `${day} · ${time}`;
}

export function formatToday() {
  const text = new Intl.DateTimeFormat("es-PE", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const shortHash = (hash: string | null | undefined) => (hash ? `${hash.slice(0, 4)}…${hash.slice(-4)}` : "—");

export function describeDevice(userAgent: string | null) {
  if (!userAgent) return "Dispositivo desconocido";
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Android/.test(userAgent)
          ? "Android"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Otro sistema";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Navegador";
  return `${os} · ${browser}`;
}

export const authMethodLabel: Record<string, string> = {
  WebAuthn: "Passkey / WebAuthn",
  EmailOTP: "Código por correo",
  Sistema: "Sistema",
};

export const actionLabel: Record<string, string> = {
  LOGIN_SUCCESS: "Inicio de sesión",
  LOGOUT: "Cierre de sesión",
  SESSIONS_REVOKE: "Cerraste otras sesiones",
  TRANSCRIPTION_APPROVE: "Validaste una transcripción",
  TRANSCRIPTION_EDIT: "Corregiste una transcripción",
  ACCESS_DENIED: "Acceso denegado",
  BREAK_GLASS: "Acceso de emergencia",
  BREAK_GLASS_REQUEST: "Solicitud de acceso excepcional",
  DOCUMENT_UPLOAD: "Documento cargado",
  DOCUMENT_ANALYZE: "Documento en análisis",
  DOCUMENT_SEND_TO_REVIEW: "Documento enviado a revisión",
  PROFESSIONAL_CREATE: "Alta de profesional",
  ROLE_CHANGE: "Cambio de rol",
  MEMBERSHIP_APPROVE: "Profesional habilitado",
  MEMBERSHIP_SUSPEND: "Profesional suspendido",
  SERVICE_STATUS_CHANGE: "Cambio de estado del sistema",
  ALERT_UPDATE: "Alerta actualizada",
  ACCESS_APPROVE: "Acceso excepcional aprobado",
  ACCESS_DENY: "Acceso excepcional denegado",
  ACCESS_REVOKE: "Acceso excepcional revocado",
};
