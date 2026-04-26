import type { Env } from "../config/env.js";
import type { FastifyBaseLogger } from "fastify";
import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
};

function smtpConfigured(env: Env): boolean {
  return Boolean(
    env.EMAIL_HOST &&
      env.EMAIL_HOST_USER &&
      env.EMAIL_HOST_PASSWORD &&
      env.DEFAULT_FROM_EMAIL,
  );
}

export async function sendEmail(
  log: FastifyBaseLogger,
  env: Env,
  message: EmailMessage,
): Promise<void> {
  if (!smtpConfigured(env)) {
    log.info(
      {
        to: message.to,
        subject: message.subject,
        text: message.text,
      },
      "E-mail not sent; SMTP is not configured",
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_USE_SSL,
    requireTLS: env.EMAIL_USE_TLS,
    auth: {
      user: env.EMAIL_HOST_USER,
      pass: env.EMAIL_HOST_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: env.DEFAULT_FROM_EMAIL,
    sender: env.SERVER_EMAIL ?? env.EMAIL_HOST_USER,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    headers: {
      "X-Mailer": "Finbar",
      "X-Email-Type": "transactional",
      ...message.headers,
    },
  });

  log.info({ to: message.to, subject: message.subject }, "E-mail sent via SMTP");
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
