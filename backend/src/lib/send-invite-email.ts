import type { Env } from "../config/env.js";
import type { FastifyBaseLogger } from "fastify";
import { escapeHtml, sendEmail } from "./email.js";

export async function sendInviteEmail(
  log: FastifyBaseLogger,
  env: Env,
  to: string,
  inviteUrl: string,
  inviteCode: string,
): Promise<void> {
  const subject = "Uitnodiging voor Finbar";
  const text = `Je bent uitgenodigd voor Finbar.

Klik op deze link om je account aan te maken:
${inviteUrl}

Je uitnodigingscode is: ${inviteCode}

Deze uitnodiging is 7 dagen geldig.`;
  const html = `<p>Je bent uitgenodigd voor Finbar.</p>
<p><a href="${escapeHtml(inviteUrl)}">Account aanmaken</a></p>
<p>Je uitnodigingscode is: <strong>${escapeHtml(inviteCode)}</strong></p>
<p>Deze uitnodiging is 7 dagen geldig.</p>`;

  await sendEmail(log, env, {
    to,
    subject,
    text,
    html,
    headers: { "X-Email-Type": "invite" },
  });
}
