import type { Env } from "../config/env.js";
import type { FastifyBaseLogger } from "fastify";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPasswordResetEmail(
  log: FastifyBaseLogger,
  env: Env,
  to: string,
  resetUrl: string,
): Promise<void> {
  const subject = "Finbar: wachtwoord herstellen";
  const text = `Klik op onderstaande link om een nieuw wachtwoord in te stellen (geldig 1 uur).

${resetUrl}

Als je dit niet hebt aangevraagd, kun je deze e-mail negeren.`;
  const html = `<p>Stel een nieuw wachtwoord in voor je Finbar-account (link 1 uur geldig):</p><p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p><p>Als je dit niet hebt aangevraagd, negeer deze e-mail.</p>`;

  if (env.RESEND_API_KEY) {
    const from = env.RESEND_FROM ?? "Finbar <onboarding@resend.dev>";
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    const body = await r.text();
    if (!r.ok) {
      log.error({ status: r.status, body }, "Resend password reset failed");
      return;
    }
    log.info({ to }, "Password reset e-mail sent via Resend");
    return;
  }

  log.info(
    { to, resetUrl },
    "Password reset link (set RESEND_API_KEY to send e-mail; link is in this log line)",
  );
}
