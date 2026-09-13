import "server-only";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { describeDevice } from "@/lib/format";
import { audit } from "@/lib/server/audit";
import { actorOf, findLoginUserById, startSession, type ServerSession } from "@/lib/server/auth";
import { sql, transaction } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import type { PasskeyInfo } from "@/lib/types";

const CHALLENGE_COOKIE = "nexo_webauthn";
const CHALLENGE_TTL_SECONDS = 300;
const RP_NAME = "Nexo Clínico";

// Respuesta del navegador (startRegistration / startAuthentication). La valida a fondo SimpleWebAuthn.
export const credentialSchema = z.looseObject({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal("public-key"),
  response: z.looseObject({ clientDataJSON: z.string().min(1) }),
});

const hexToBase64Url = (hex: string) => Buffer.from(hex, "hex").toString("base64url");
const base64UrlToHex = (value: string) => Buffer.from(value, "base64url").toString("hex");

// rpID y origen deben coincidir con el navegador: localhost en desarrollo; en producción fíjalos por entorno.
async function relyingParty() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const protocol = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = process.env.WEBAUTHN_ORIGIN ?? `${protocol}://${host}`;
  return { origin, rpID: process.env.WEBAUTHN_RP_ID ?? new URL(origin).hostname };
}

// El desafío vive en la base; el navegador solo guarda su id en una cookie httpOnly de corta duración.
async function saveChallenge(purpose: "registro" | "login", challenge: string, userId: string | null) {
  const [row] = await sql`
    insert into webauthn_challenges (purpose, challenge, user_id, expires_at)
    values (${purpose}, ${challenge}, ${userId}, now() + ${`${CHALLENGE_TTL_SECONDS} seconds`}::interval)
    returning id`;
  (await cookies()).set(CHALLENGE_COOKIE, row!.id, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

async function consumeChallenge(purpose: "registro" | "login", userId: string | null) {
  const store = await cookies();
  const id = store.get(CHALLENGE_COOKIE)?.value;
  store.delete(CHALLENGE_COOKIE);
  const expired = new ApiError(400, "La verificación con passkey expiró. Inténtalo de nuevo.");
  if (!id || !z.uuid().safeParse(id).success) throw expired;

  const [row] = await sql`
    update webauthn_challenges set consumed_at = now()
    where id = ${id} and purpose = ${purpose} and consumed_at is null and expires_at > now()
      and user_id is not distinct from ${userId}::uuid
    returning challenge`;
  if (!row) throw expired;
  return row.challenge as string;
}

export async function registrationOptions(session: ServerSession) {
  const { rpID } = await relyingParty();
  const existing = await sql`
    select encode(credential_id, 'hex') as id, transports from passkeys where user_id = ${session.userId}`;

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: session.email,
    userDisplayName: session.name,
    // Id estable por usuario: registrar de nuevo en el mismo autenticador reemplaza la credencial anterior.
    userID: new Uint8Array(Buffer.from(session.userId.replaceAll("-", ""), "hex")),
    attestationType: "none",
    excludeCredentials: existing.map((row) => ({ id: hexToBase64Url(row.id), transports: row.transports })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
  });
  await saveChallenge("registro", options.challenge, session.userId);
  return options;
}

export async function verifyRegistration(session: ServerSession, response: RegistrationResponseJSON) {
  const expectedChallenge = await consumeChallenge("registro", session.userId);
  const { origin, rpID } = await relyingParty();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  }).catch((error: Error) => {
    throw new ApiError(400, `No se pudo verificar la passkey: ${error.message}`);
  });
  if (!verification.verified) throw new ApiError(400, "No se pudo verificar la passkey.");

  const { credential, aaguid } = verification.registrationInfo;
  const deviceLabel = describeDevice((await headers()).get("user-agent"));

  return transaction(async (tx): Promise<PasskeyInfo> => {
    const [row] = await tx`
      insert into passkeys (user_id, credential_id, public_key, sign_count, transports, aaguid, device_label)
      values (${session.userId}, decode(${base64UrlToHex(credential.id)}, 'hex'),
              decode(${Buffer.from(credential.publicKey).toString("hex")}, 'hex'),
              ${credential.counter}, ${credential.transports ?? []}, ${aaguid}, ${deviceLabel})
      returning id, device_label, created_at`;
    await audit(tx, actorOf(session), {
      action: "PASSKEY_REGISTER",
      resourceType: "passkey",
      resourceRef: deviceLabel,
      result: "ALLOW",
      metadata: { passkeyId: row!.id },
    });
    return { id: row!.id, deviceLabel: row!.device_label, createdAt: row!.created_at, lastUsedAt: null };
  });
}

export async function authenticationOptions(email?: string) {
  const { rpID } = await relyingParty();
  let allowCredentials: { id: string; transports?: string[] }[] | undefined;
  if (email) {
    const rows = await sql`
      select encode(p.credential_id, 'hex') as id, p.transports
      from passkeys p join users u on u.id = p.user_id
      where u.email = ${email.trim().toLowerCase()} and u.is_active`;
    // Sin passkeys para ese correo se ofrece la lista del navegador, para no revelar qué cuentas existen.
    if (rows.length > 0) {
      allowCredentials = rows.map((row) => ({ id: hexToBase64Url(row.id), transports: row.transports }));
    }
  }
  const options = await generateAuthenticationOptions({ rpID, allowCredentials, userVerification: "required" });
  await saveChallenge("login", options.challenge, null);
  return options;
}

export async function loginWithPasskey(response: AuthenticationResponseJSON) {
  const expectedChallenge = await consumeChallenge("login", null);
  const [passkey] = await sql`
    select id, user_id, encode(public_key, 'hex') as public_key, sign_count, transports
    from passkeys where credential_id = decode(${base64UrlToHex(response.id)}, 'hex')`;
  if (!passkey) throw new ApiError(401, "Esta passkey no está registrada en Nexo Clínico.");

  const { origin, rpID } = await relyingParty();
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: response.id,
      publicKey: new Uint8Array(Buffer.from(passkey.public_key, "hex")),
      counter: Number(passkey.sign_count),
      transports: passkey.transports,
    },
  }).catch((error: Error) => {
    throw new ApiError(401, `No se pudo verificar la passkey: ${error.message}`);
  });
  if (!verification.verified) throw new ApiError(401, "No se pudo verificar la passkey.");

  const user = await findLoginUserById(passkey.user_id);
  if (!user) throw new ApiError(403, "Tu cuenta aún no está habilitada por la institución.");

  await sql`
    update passkeys set sign_count = ${verification.authenticationInfo.newCounter}, last_used_at = now()
    where id = ${passkey.id}`;
  return startSession(user, "WebAuthn", { passkeyId: passkey.id }, passkey.id);
}

export async function deletePasskey(session: ServerSession, id: string) {
  await transaction(async (tx) => {
    const [removed] = await tx`
      delete from passkeys where id = ${id} and user_id = ${session.userId} returning device_label`;
    if (!removed) throw new ApiError(404, "Passkey no encontrada.");
    await audit(tx, actorOf(session), {
      action: "PASSKEY_DELETE",
      resourceType: "passkey",
      resourceRef: removed.device_label,
      result: "ALLOW",
      metadata: { passkeyId: id },
    });
  });
}
