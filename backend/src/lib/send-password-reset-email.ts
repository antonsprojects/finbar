import type { Env } from "../config/env.js";
import type { FastifyBaseLogger } from "fastify";
import { escapeHtml, sendEmail } from "./email.js";

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

  await sendEmail(log, env, {
    to,
    subject,
    text,
    html,
    headers: { "X-Email-Type": "password-reset" },
  });
}
