import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { Env } from "../config/env.js";
import { ok } from "../lib/api-response.js";
import { HttpError } from "../lib/http-error.js";
import {
  createPasswordResetSecret,
  hashPasswordResetToken,
} from "../lib/password-reset-token.js";
import { preferenceJson } from "../lib/user-preference-json.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { sendPasswordResetEmail } from "../lib/send-password-reset-email.js";
import { parseBody } from "../lib/validate.js";

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordBody = z.object({
  email: z.string().email(),
});

const resetPasswordBody = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const patchMeBody = z.object({
  name: z.string().max(200).optional(),
});

const COOKIE = "finbar_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function createAuthRoutes(env: Env): FastifyPluginAsync {
  return async (app) => {
    app.post("/register", async (request, reply) => {
      const { email, password, name } = parseBody(registerBody, request.body);
      const normalizedEmail = email.trim().toLowerCase();
      const exists = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      });
      if (exists) {
        throw new HttpError(
          409,
          "CONFLICT",
          "Dit e-mailadres is al geregistreerd",
        );
      }
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name ?? null,
        },
      });
      const token = await reply.jwtSign({ sub: user.id });
      reply.setCookie(COOKIE, token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
      });
      return reply.send(
        ok({ user: { id: user.id, email: user.email, name: user.name } }),
      );
    });

    app.post("/login", async (request, reply) => {
      const { email, password } = parseBody(loginBody, request.body);
      const normalizedEmail = email.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      });
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new HttpError(
          401,
          "INVALID_CREDENTIALS",
          "Ongeldig e-mailadres of wachtwoord",
        );
      }
      const token = await reply.jwtSign({ sub: user.id });
      reply.setCookie(COOKIE, token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
      });
      return reply.send(
        ok({ user: { id: user.id, email: user.email, name: user.name } }),
      );
    });

    app.post("/logout", async (_request, reply) => {
      reply.clearCookie(COOKIE, { path: "/" });
      return reply.send(ok({ ok: true as const }));
    });

    /** Same response whether the e-mail exists (avoid account enumeration). */
    app.post("/forgot-password", async (request, reply) => {
      const { email } = parseBody(forgotPasswordBody, request.body);
      const normalized = email.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email: { equals: normalized, mode: "insensitive" } },
      });
      if (user) {
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        });
        const { rawToken, tokenHash } = createPasswordResetSecret();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt },
        });
        const base = env.PUBLIC_APP_URL.replace(/\/$/, "");
        const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
        await sendPasswordResetEmail(request.log, env, user.email, resetUrl);
      }
      return reply.send(
        ok({
          ok: true as const,
          message:
            "Als dit e-mailadres bij ons bekend is, ontvang je een bericht met instructies.",
        }),
      );
    });

    app.post("/reset-password", async (request, reply) => {
      const { token, password } = parseBody(resetPasswordBody, request.body);
      const tokenHash = hashPasswordResetToken(token);
      const row = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      if (!row || row.expiresAt < new Date()) {
        throw new HttpError(
          400,
          "INVALID_RESET_TOKEN",
          "Ongeldige of verlopen link. Vraag een nieuwe aan.",
        );
      }
      const passwordHash = await hashPassword(password);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: row.userId },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.deleteMany({
          where: { userId: row.userId },
        }),
      ]);
      return reply.send(ok({ ok: true as const }));
    });

    app.get(
      "/me",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        const sub = request.user.sub;
        const user = await prisma.user.findUnique({
          where: { id: sub },
          select: { id: true, email: true, name: true, preference: true },
        });
        if (!user) {
          throw new HttpError(401, "UNAUTHORIZED", "Gebruiker niet gevonden");
        }
        const { preference, ...rest } = user;
        return reply.send(
          ok({
            user: {
              ...rest,
              preference: preferenceJson(preference),
            },
          }),
        );
      },
    );

    app.patch(
      "/me",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        const sub = request.user.sub;
        const body = parseBody(patchMeBody, request.body);
        if (body.name === undefined) {
          throw new HttpError(
            400,
            "VALIDATION_ERROR",
            "Geen velden om bij te werken",
          );
        }
        const trimmed = body.name.trim();
        const user = await prisma.user.update({
          where: { id: sub },
          data: { name: trimmed === "" ? null : trimmed },
          select: { id: true, email: true, name: true, preference: true },
        });
        const { preference, ...rest } = user;
        return reply.send(
          ok({
            user: {
              ...rest,
              preference: preferenceJson(preference),
            },
          }),
        );
      },
    );
  };
}
