import type { Env } from "../config/env.js";
import type { FastifyBaseLogger } from "fastify";
import { escapeHtml, sendEmail } from "./email.js";

export type InviteAcceptedEmailUser = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
};

function displayName(user: InviteAcceptedEmailUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}

export async function sendAdminInviteAcceptedEmail(
  log: FastifyBaseLogger,
  env: Env,
  to: string,
  user: InviteAcceptedEmailUser,
  invitedEmail: string,
): Promise<void> {
  const name = displayName(user);
  const adminUrl = `${env.PUBLIC_APP_URL.replace(/\/$/, "")}/admin`;
  const subject = "Nieuwe Finbar-account aangemaakt";
  const lines = [
    "Een gebruiker heeft een uitnodiging geaccepteerd en een Finbar-account aangemaakt.",
    "",
    `Account: ${user.email}`,
    `Uitgenodigd e-mailadres: ${invitedEmail}`,
    name ? `Naam: ${name}` : null,
    user.companyName ? `Bedrijf: ${user.companyName}` : null,
    "",
    `Bekijk dit in Finbar: ${adminUrl}`,
  ].filter((line): line is string => line !== null);
  const text = lines.join("\n");
  const html = `<p>Een gebruiker heeft een uitnodiging geaccepteerd en een Finbar-account aangemaakt.</p>
<ul>
  <li><strong>Account:</strong> ${escapeHtml(user.email)}</li>
  <li><strong>Uitgenodigd e-mailadres:</strong> ${escapeHtml(invitedEmail)}</li>
  ${name ? `<li><strong>Naam:</strong> ${escapeHtml(name)}</li>` : ""}
  ${user.companyName ? `<li><strong>Bedrijf:</strong> ${escapeHtml(user.companyName)}</li>` : ""}
</ul>
<p><a href="${escapeHtml(adminUrl)}">Bekijk dit in Finbar</a></p>`;

  await sendEmail(log, env, {
    to,
    subject,
    text,
    html,
    headers: { "X-Email-Type": "invite-accepted" },
  });
}
