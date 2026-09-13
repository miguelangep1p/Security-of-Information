import "server-only";
import nodemailer from "nodemailer";
import { ApiError } from "@/lib/server/http";

const FROM = process.env.SMTP_FROM ?? process.env.RESEND_FROM ?? "Nexo Clínico <onboarding@resend.dev>";

type SendEmailInput = { to: string; subject: string; html: string; text: string };

let smtp: ReturnType<typeof nodemailer.createTransport> | null = null;

// Gmail (vía SMTP con tu cuenta) entrega a cualquier destinatario sin verificar dominio.
function smtpTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  smtp ??= nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return smtp;
}

// Orden: SMTP (Gmail) si está configurado > Resend > consola (desarrollo sin proveedor).
export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const transport = smtpTransport();
  if (transport) {
    try {
      await transport.sendMail({ from: FROM, to, subject, html, text });
    } catch (error) {
      console.error("[nexo] SMTP error", error);
      throw new ApiError(502, "No pudimos enviar el correo. Intenta de nuevo en unos minutos.");
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[nexo] (sin proveedor de correo) Correo a ${to} — ${subject}\n${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (!response.ok) {
    console.error("[nexo] Resend error", response.status, await response.text().catch(() => ""));
    throw new ApiError(502, "No pudimos enviar el correo. Intenta de nuevo en unos minutos.");
  }
}

export function otpEmail(code: string) {
  const text = `Tu código de verificación de Nexo Clínico es ${code}. Vence en 10 minutos.`;
  const html = `
    <div style="background:#f6f8f7;padding:40px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;margin:0 auto">
        <tr>
          <td style="background:#ffffff;border:1px solid #dfe6e3;border-radius:16px;padding:36px 32px;text-align:center">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
              <tr>
                <td style="width:32px;height:32px;background:#0c7364;border-radius:8px;text-align:center;vertical-align:middle;color:#ffffff;font-size:16px;line-height:32px">
                  ✚
                </td>
                <td style="padding-left:10px;font-size:16px;font-weight:700;color:#17211f;vertical-align:middle">
                  Nexo Clínico
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#687470;font-weight:600">
              Código de verificación
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#687470">
              Úsalo para confirmar tu correo institucional. Vence en 10 minutos.
            </p>
            <div style="background:#e6f3f0;border-radius:12px;padding:20px;margin-bottom:24px">
              <span style="font-size:38px;font-weight:800;letter-spacing:.22em;color:#0c7364">${code}</span>
            </div>
            <p style="margin:0;font-size:12.5px;color:#8a9a96;line-height:1.5">
              Si no solicitaste este código, puedes ignorar este correo con confianza.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:20px;text-align:center;font-size:11.5px;color:#a9b5b1">
            Registro protegido · Datos de demostración
          </td>
        </tr>
      </table>
    </div>`;
  return { subject: `${code} es tu código de verificación`, html, text };
}
