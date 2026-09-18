import "server-only";
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { cookies, headers } from "next/headers";
import { audit, type Actor, type AuthMethod } from "@/lib/server/audit";
import { sql, transaction, type Row } from "@/lib/server/db";
import { otpEmail, sendEmail } from "@/lib/server/email";
import { ApiError } from "@/lib/server/http";
import type { MembershipStatus, Role, Session, User } from "@/lib/types";

const SESSION_COOKIE = "nexo_session";
const SESSION_TTL_HOURS = 8;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_WINDOW = 3;

export const demoMode = () => process.env.NEXO_DEMO_MODE === "true";

export type ServerSession = Session & {
  sessionId: string;
  membershipId: string;
  institutionId: string;
  membershipStatus: MembershipStatus;
  authMethod: AuthMethod;
  riskScore: number;
  ip: string | null;
};

export const sha256Hex = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export const sessionRef = (sessionId: string) => `Sesión ${sessionId.slice(0, 4).toUpperCase()}`;

export const actorOf = (session: ServerSession): Actor => ({
  userId: session.userId,
  cmp: session.cmp ?? null,
  sessionId: session.sessionId,
  authMethod: session.authMethod,
  ip: session.ip,
  riskScore: session.riskScore,
});

export const publicSession = (session: ServerSession): Session => ({
  userId: session.userId,
  name: session.name,
  shortName: session.shortName,
  initials: session.initials,
  role: session.role,
  email: session.email,
  institution: session.institution,
  cmp: session.cmp,
  membershipStatus: session.membershipStatus,
});

export async function requestIp() {
  const list = await headers();
  const candidate = list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? list.get("x-real-ip");
  return candidate && isIP(candidate) ? candidate : null;
}

export async function getSession(): Promise<ServerSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await sql`
    with active as (
      update sessions set last_seen_at = now()
      where token_hash = decode(${sha256Hex(token)}, 'hex')
        and revoked_at is null
        and expires_at > now()
      returning id, user_id, membership_id, auth_method, risk_score
    )
    select a.id as session_id, a.membership_id, a.auth_method, a.risk_score,
           u.id as user_id, u.full_name, u.short_name, u.email,
           m.role, m.status as membership_status, m.institution_id, i.name as institution, pp.cmp
    from active a
    join users u        on u.id = a.user_id and u.is_active
    join memberships m  on m.id = a.membership_id
    join institutions i on i.id = m.institution_id
    left join professional_profiles pp on pp.user_id = u.id`;
  if (!row) return null;

  return {
    sessionId: row.session_id,
    membershipId: row.membership_id,
    institutionId: row.institution_id,
    membershipStatus: row.membership_status,
    authMethod: row.auth_method,
    riskScore: row.risk_score,
    ip: await requestIp(),
    userId: row.user_id,
    name: row.full_name,
    shortName: row.short_name,
    initials: initialsOf(row.short_name),
    role: row.role,
    email: row.email,
    institution: row.institution,
    cmp: row.cmp ?? undefined,
  };
}

// Autorización en el servidor: sin roles solo exige sesión (autoservicio de cuenta, aún si está Pendiente).
// Con roles, además exige que el vínculo institucional esté Habilitado.
export async function requireRole(...roles: Role[]) {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Tu sesión expiró. Inicia sesión nuevamente.");
  if (roles.length > 0) {
    if (session.membershipStatus !== "Habilitado") {
      throw new ApiError(403, "Tu cuenta está pendiente de aprobación institucional.");
    }
    if (!roles.includes(session.role)) {
      throw new ApiError(403, "Tu rol no tiene permiso para esta acción.");
    }
  }
  return session;
}

async function findLoginUser(email: string) {
  return findEnabledUser(email, null);
}

export async function findLoginUserById(userId: string) {
  return findEnabledUser(null, userId);
}

// Usuario activo con al menos un vínculo habilitado, buscado por correo o por id.
async function findEnabledUser(email: string | null, userId: string | null) {
  const [row] = await sql`
    select u.id, u.full_name, u.short_name, u.email, pp.cmp, pp.specialty,
           m.id as membership_id, m.role, i.name as institution
    from users u
    join memberships m  on m.user_id = u.id and m.status = 'Habilitado'
    join institutions i on i.id = m.institution_id
    left join professional_profiles pp on pp.user_id = u.id
    where (u.email = ${email}::citext or u.id = ${userId}::uuid) and u.is_active
    order by m.created_at
    limit 1`;
  return row ?? null;
}

export async function startSession(
  user: Row,
  authMethod: AuthMethod,
  metadata: Record<string, unknown>,
  passkeyId: string | null = null,
) {
  const token = randomBytes(32).toString("base64url");
  const sessionId = randomUUID();
  const ip = await requestIp();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;

  await transaction(async (tx) => {
    await tx`
      insert into sessions (id, token_hash, user_id, membership_id, auth_method, passkey_id, ip, user_agent, expires_at)
      values (${sessionId}, decode(${sha256Hex(token)}, 'hex'), ${user.id}, ${user.membership_id},
              ${authMethod}, ${passkeyId}, ${ip}, ${userAgent}, now() + ${`${SESSION_TTL_HOURS} hours`}::interval)`;
    await audit(
      tx,
      { userId: user.id, cmp: user.cmp, sessionId, authMethod, ip, riskScore: 0 },
      { action: "LOGIN_SUCCESS", resourceType: "session", resourceRef: sessionRef(sessionId), result: "ALLOW", metadata },
    );
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 3600,
  });

  return {
    userId: user.id,
    name: user.full_name,
    shortName: user.short_name,
    initials: initialsOf(user.short_name),
    role: user.role,
    email: user.email,
    institution: user.institution,
    cmp: user.cmp ?? undefined,
    // Los flujos de login solo alcanzan usuarios Habilitado; el autorregistro pasa 'Pendiente' explícitamente.
    membershipStatus: (user.membership_status as MembershipStatus | undefined) ?? "Habilitado",
  } satisfies Session;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const INVALID_CODE = "El código no es válido o ya venció. Solicita uno nuevo.";

export async function requestEmailCode(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const user = await findLoginUser(email);
  // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
  if (!user) return { devCode: null };

  const [{ recent }] = await sql`
    select count(*)::int as recent from email_otps
    where email = ${email} and created_at > now() - interval '10 minutes'`;
  if (recent >= OTP_MAX_PER_WINDOW) {
    throw new ApiError(429, "Solicitaste demasiados códigos. Espera unos minutos.");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await sql`
    insert into email_otps (email, purpose, code_hash, expires_at)
    values (${email}, 'login', ${sha256Hex(`${email}:${code}`)}, now() + interval '10 minutes')`;

  // En modo demo el código se muestra en pantalla; no depende de un proveedor de correo real.
  if (!demoMode()) await sendEmail({ to: email, ...otpEmail(code) });
  return { devCode: demoMode() ? code : null };
}

export async function loginWithEmailCode(rawEmail: string, code: string) {
  const email = normalizeEmail(rawEmail);
  const [otp] = await sql`
    select id, code_hash, attempts from email_otps
    where email = ${email} and purpose = 'login' and consumed_at is null and expires_at > now()
    order by created_at desc
    limit 1`;
  if (!otp) throw new ApiError(401, INVALID_CODE);
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "Superaste los intentos permitidos. Solicita un código nuevo.");
  }

  const matches = timingSafeEqual(
    Buffer.from(otp.code_hash, "hex"),
    Buffer.from(sha256Hex(`${email}:${code}`), "hex"),
  );
  if (!matches) {
    await sql`update email_otps set attempts = attempts + 1 where id = ${otp.id}`;
    throw new ApiError(401, INVALID_CODE);
  }

  const [consumed] = await sql`
    update email_otps set consumed_at = now() where id = ${otp.id} and consumed_at is null returning id`;
  if (!consumed) throw new ApiError(401, INVALID_CODE);

  const user = await findLoginUser(email);
  if (!user) throw new ApiError(403, "Tu cuenta aún no está habilitada por la institución.");
  return startSession(user, "EmailOTP", {});
}

// Perfiles de demostración y Passkey simulada. Solo con NEXO_DEMO_MODE=true.
export async function listDemoUsers(): Promise<User[]> {
  if (!demoMode()) throw new ApiError(404, "No disponible.");
  const rows = await sql`
    select distinct on (u.id) u.id, u.full_name, u.short_name, u.email, m.role, i.name as institution,
           pp.cmp, pp.specialty, pp.rne, pp.regional_council
    from users u
    join memberships m  on m.user_id = u.id and m.status = 'Habilitado'
    join institutions i on i.id = m.institution_id
    left join professional_profiles pp on pp.user_id = u.id
    where u.is_active
    order by u.id, m.created_at`;
  const roleOrder: Role[] = ["MÉDICO", "ADMIN", "DIGITALIZADOR"];
  return rows
    .map(
      (row): User => ({
        id: row.id,
        name: row.full_name,
        shortName: row.short_name,
        initials: initialsOf(row.short_name),
        role: row.role,
        email: row.email,
        institution: row.institution,
        cmp: row.cmp ?? undefined,
        specialty: row.specialty ?? undefined,
        rne: row.rne ?? undefined,
        council: row.regional_council ?? undefined,
      }),
    )
    .sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role) || a.name.localeCompare(b.name));
}

export async function loginDemo(rawEmail: string) {
  if (!demoMode()) throw new ApiError(404, "No disponible.");
  const user = await findLoginUser(normalizeEmail(rawEmail));
  if (!user) throw new ApiError(404, "El correo institucional no está registrado o no está habilitado.");
  return startSession(user, "WebAuthn", { demo: true });
}

export async function logout() {
  const session = await getSession();
  if (session) {
    await transaction(async (tx) => {
      await tx`update sessions set revoked_at = now() where id = ${session.sessionId}`;
      await audit(tx, actorOf(session), {
        action: "LOGOUT",
        resourceType: "session",
        resourceRef: sessionRef(session.sessionId),
        result: "ALLOW",
      });
    });
  }
  (await cookies()).delete(SESSION_COOKIE);
}
