import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import { audit } from "@/lib/server/audit";
import { demoMode, requestIp, sha256Hex, startSession } from "@/lib/server/auth";
import { sql, transaction } from "@/lib/server/db";
import { otpEmail, sendEmail } from "@/lib/server/email";
import { ApiError } from "@/lib/server/http";
import { shortNameOf } from "@/lib/server/professionals";
import type { Institution } from "@/lib/types";

const OTP_MAX_PER_WINDOW = 3;
const OTP_MAX_ATTEMPTS = 5;
const INVALID_CODE = "El código no es válido o ya venció. Solicita uno nuevo.";

// No hay acceso real al Colegio Médico: la consulta CMP sigue simulada (ver /registro).
export const simulateCmpVerified = (cmp: string) => cmp !== "000000";

type Identity = { nombres: string; apellidoPaterno: string; apellidoMaterno: string };

// Sin PERUDEVS_API_KEY, la identidad se simula (determinística por DNI) para no romper el flujo en dev.
const FIRST_NAMES = ["Carlos", "Rosa", "Luis", "Elena", "Ana", "Diego", "Marco", "Fiorella", "Jorge", "Patricia"];
const PATERNAL = ["Mendoza", "Huamán", "Paredes", "Quispe", "Valdivia", "Robles", "Chávez", "Ramírez", "Flores", "Torres"];
const MATERNAL = ["Salazar", "Vega", "Ortiz", "Ramos", "Cruz", "Tapia", "Delgado", "Núñez", "Campos", "Silva"];

function simulateIdentity(dni: string): Identity | null {
  if (new Set(dni).size === 1) return null; // "00000000", "11111111"… → caso inválido de la demo.
  const n = Number(dni);
  return {
    nombres: FIRST_NAMES[n % FIRST_NAMES.length]!,
    apellidoPaterno: PATERNAL[Math.floor(n / 10) % PATERNAL.length]!,
    apellidoMaterno: MATERNAL[Math.floor(n / 100) % MATERNAL.length]!,
  };
}

type PeruDevsResponse = {
  estado?: boolean;
  resultado?: { nombres?: string; apellido_paterno?: string; apellido_materno?: string };
};

// Consulta real de identidad (RENIEC) vía PeruDevs. Server-only: la clave nunca llega al cliente.
async function fetchIdentity(dni: string): Promise<Identity | null> {
  const key = process.env.PERUDEVS_API_KEY;
  if (!key) return simulateIdentity(dni);

  const url = `https://api.perudevs.com/api/v1/dni/simple?document=${dni}&key=${encodeURIComponent(key)}`;
  let data: PeruDevsResponse;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    console.error("[nexo] PeruDevs error", error);
    throw new ApiError(502, "No pudimos consultar tu identidad en este momento. Intenta de nuevo.");
  }

  if (!data.estado || !data.resultado) return null;
  const { nombres, apellido_paterno, apellido_materno } = data.resultado;
  if (!nombres || !apellido_paterno || !apellido_materno) return null;
  return { nombres, apellidoPaterno: apellido_paterno, apellidoMaterno: apellido_materno };
}

export async function checkDni(dni: string) {
  const [existing] = await sql`select 1 from users where dni = ${dni}`;
  if (existing) return { status: "ya_registrado" as const };
  const identity = await fetchIdentity(dni);
  if (!identity) return { status: "no_encontrado" as const };
  return { status: "encontrado" as const, ...identity };
}

async function institutionByEmailDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const [row] = await sql`select id, name, kind, city, email_domain from institutions where email_domain = ${domain}`;
  return row ?? null;
}

export async function listPublicInstitutions(): Promise<Institution[]> {
  const rows = await sql`select id, name, kind, city from institutions order by name`;
  return rows.map((row) => ({ id: row.id, name: row.name, kind: row.kind, city: row.city }));
}

export async function requestRegistroCode(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const [existingUser] = await sql`select 1 from users where email = ${email}::citext`;
  if (existingUser) throw new ApiError(409, "Ya existe una cuenta con este correo.");

  const institution = await institutionByEmailDomain(email);
  if (!institution) throw new ApiError(422, "Usa el correo de una institución afiliada a Nexo Clínico.");

  const [{ recent }] = await sql`
    select count(*)::int as recent from email_otps
    where email = ${email} and purpose = 'registro' and created_at > now() - interval '10 minutes'`;
  if (recent >= OTP_MAX_PER_WINDOW) {
    throw new ApiError(429, "Solicitaste demasiados códigos. Espera unos minutos.");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await sql`
    insert into email_otps (email, purpose, code_hash, expires_at)
    values (${email}, 'registro', ${sha256Hex(`${email}:${code}`)}, now() + interval '10 minutes')`;

  // En modo demo el código se muestra en pantalla; no depende de un proveedor de correo real.
  if (!demoMode()) await sendEmail({ to: email, ...otpEmail(code) });
  return { devCode: demoMode() ? code : null };
}

export async function verifyRegistroCode(rawEmail: string, code: string) {
  const email = rawEmail.trim().toLowerCase();
  const [otp] = await sql`
    select id, code_hash, attempts from email_otps
    where email = ${email} and purpose = 'registro' and consumed_at is null and expires_at > now()
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
    update email_otps set consumed_at = now() where id = ${otp.id} and consumed_at is null returning id::text`;
  if (!consumed) throw new ApiError(401, INVALID_CODE);
  return { ticket: consumed.id as string };
}

export type RegistroInput = {
  dni: string;
  email: string;
  ticket: string;
  cmp: string;
  manualReview: boolean;
  institutionId: string;
};

export async function submitRegistro(input: RegistroInput) {
  const email = input.email.trim().toLowerCase();

  const [ticketRow] = await sql`
    select 1 from email_otps
    where id = ${input.ticket}::uuid and email = ${email} and purpose = 'registro'
      and consumed_at is not null and consumed_at > now() - interval '30 minutes'`;
  if (!ticketRow) throw new ApiError(401, "La verificación de tu correo expiró. Vuelve a verificarla.");

  const identity = await fetchIdentity(input.dni);
  if (!identity) throw new ApiError(422, "No pudimos verificar tu identidad con este DNI.");

  let cmpStatus: "verificado" | "revision_manual";
  if (input.manualReview) {
    cmpStatus = "revision_manual";
  } else if (simulateCmpVerified(input.cmp)) {
    cmpStatus = "verificado";
  } else {
    throw new ApiError(422, "No pudimos verificar este CMP. Solicita una revisión manual.");
  }

  const [institution] = await sql`
    select name, email_domain from institutions where id = ${input.institutionId}::uuid`;
  if (!institution) throw new ApiError(422, "La institución no existe.");
  if (institution.email_domain && !email.endsWith(`@${institution.email_domain}`)) {
    throw new ApiError(422, `Tu correo no pertenece a ${institution.name}.`);
  }

  const fullName = `${identity.nombres} ${identity.apellidoPaterno} ${identity.apellidoMaterno}`;
  const cmpVerifiedAt = cmpStatus === "verificado" ? new Date().toISOString() : null;

  // Sesión aparte, después de confirmar el commit: startSession abre su propia conexión/transacción
  // y no vería las filas si aún estuvieran sin confirmar en esta.
  const created = await transaction(async (tx) => {
    const [user] = await tx`
      insert into users (dni, full_name, short_name, email, email_verified_at, identity_verified_at)
      values (${input.dni}, ${fullName}, ${shortNameOf(fullName)}, ${email}, now(), now())
      returning id, full_name, short_name, email`;

    await tx`
      insert into professional_profiles (user_id, cmp, cmp_status, cmp_verified_at, regional_council)
      values (${user!.id}, ${input.cmp}, ${cmpStatus}, ${cmpVerifiedAt}, 'La Libertad')`;

    const [membership] = await tx`
      insert into memberships (user_id, institution_id, role, status)
      values (${user!.id}, ${input.institutionId}::uuid, 'MÉDICO', 'Pendiente')
      returning id`;

    await audit(
      tx,
      { userId: user!.id, cmp: input.cmp, sessionId: null, authMethod: "EmailOTP", ip: await requestIp(), riskScore: 0 },
      {
        action: "SELF_REGISTER",
        resourceType: "membership",
        resourceRef: email,
        result: "ALLOW",
        metadata: { membershipId: membership!.id, institution: institution.name, cmpStatus },
      },
    );

    return { user: user!, membershipId: membership!.id as string };
  });

  return startSession(
    {
      id: created.user.id,
      full_name: created.user.full_name,
      short_name: created.user.short_name,
      email: created.user.email,
      cmp: input.cmp,
      membership_id: created.membershipId,
      role: "MÉDICO",
      institution: institution.name,
      membership_status: "Pendiente",
    },
    "EmailOTP",
    { selfRegistered: true },
  );
}
