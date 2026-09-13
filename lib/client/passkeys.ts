"use client";

import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api, ApiRequestError } from "@/lib/client/api";
import type { PasskeyInfo, Session } from "@/lib/types";

type CreationOptions = Parameters<typeof startRegistration>[0]["optionsJSON"];
type RequestOptions = Parameters<typeof startAuthentication>[0]["optionsJSON"];

function friendlyError(error: unknown) {
  if (error instanceof ApiRequestError) return error;
  switch ((error as Error | null)?.name) {
    case "NotAllowedError":
    case "AbortError":
      return new Error("Se canceló o expiró la verificación con passkey.");
    case "InvalidStateError":
      return new Error("Este dispositivo ya tiene una passkey registrada para tu cuenta.");
    case "SecurityError":
      return new Error("Este dominio no admite passkeys. Abre la app en localhost o en tu dominio con HTTPS.");
    default:
      return new Error((error as Error | null)?.message ?? "No se pudo usar la passkey.");
  }
}

export async function registerPasskey() {
  if (!browserSupportsWebAuthn()) throw new Error("Este navegador no soporta passkeys.");
  try {
    const optionsJSON = await api<CreationOptions>("/api/passkeys/registro/opciones", { method: "POST" });
    const response = await startRegistration({ optionsJSON });
    const { passkey } = await api<{ passkey: PasskeyInfo }>("/api/passkeys/registro/verificar", {
      body: { response },
    });
    return passkey;
  } catch (error) {
    throw friendlyError(error);
  }
}

export async function signInWithPasskey(email?: string) {
  if (!browserSupportsWebAuthn()) throw new Error("Este navegador no soporta passkeys.");
  try {
    const optionsJSON = await api<RequestOptions>("/api/auth/passkey/opciones", { body: { email } });
    const response = await startAuthentication({ optionsJSON });
    const { session } = await api<{ session: Session }>("/api/auth/passkey/verificar", { body: { response } });
    return session;
  } catch (error) {
    throw friendlyError(error);
  }
}
