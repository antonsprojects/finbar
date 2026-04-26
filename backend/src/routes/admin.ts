import type { FastifyPluginAsync } from "fastify";
import type { Env } from "../config/env.js";
import { AccountRole, type Invite, type User } from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import {
  getRealAccountId,
  requireAdmin,
  setSessionCookie,
} from "../lib/auth-context.js";
import { HttpError } from "../lib/http-error.js";
import { createInviteCode, hashInviteCode } from "../lib/invite-code.js";
import { prisma } from "../lib/prisma.js";
import { sendInviteEmail } from "../lib/send-invite-email.js";
import { parseBody, parseParams } from "../lib/validate.js";

const inviteBody = z.object({
  email: z.string().email(),
});

const idParams = z.object({
  id: z.string().min(1),
});

function userJson(
  user: Pick<User, "id" | "email" | "role" | "firstName" | "lastName" | "companyName" | "createdAt">,
) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    companyName: user.companyName,
    createdAt: user.createdAt.toISOString(),
  };
}

function inviteStatus(invite: Invite): "active" | "expired" | "revoked" | "used" {
  if (invite.usedAt) return "used";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt <= new Date()) return "expired";
  return "active";
}

function inviteJson(invite: Invite) {
  return {
    id: invite.id,
    email: invite.email,
    status: inviteStatus(invite),
    expiresAt: invite.expiresAt.toISOString(),
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    usedAt: invite.usedAt?.toISOString() ?? null,
    usedByUserId: invite.usedByUserId,
    createdAt: invite.createdAt.toISOString(),
  };
}

async function createUniqueInviteCode(): Promise<{
  rawCode: string;
  codeHash: string;
}> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rawCode = createInviteCode();
    const codeHash = hashInviteCode(rawCode);
    const exists = await prisma.invite.findUnique({ where: { codeHash } });
    if (!exists) return { rawCode, codeHash };
  }
  throw new HttpError(
    500,
    "INVITE_CODE_GENERATION_FAILED",
    "Kon geen unieke uitnodigingscode maken",
  );
}

function inviteUrl(publicAppUrl: string, rawCode: string): string {
  const base = publicAppUrl.replace(/\/$/, "");
  return `${base}/register?inviteCode=${encodeURIComponent(rawCode)}`;
}

export function adminRoutes(env: Env): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);
    app.addHook("preHandler", async (request) => {
      requireAdmin(request);
    });

    app.get("/invites", async (_request, reply) => {
      const invites = await prisma.invite.findMany({
        orderBy: { createdAt: "desc" },
      });
      return reply.send(ok({ invites: invites.map(inviteJson) }));
    });

    app.post("/invites", async (request, reply) => {
      const { email } = parseBody(inviteBody, request.body);
      const normalizedEmail = email.trim().toLowerCase();
      const activeInvite = await prisma.invite.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (activeInvite) {
        throw new HttpError(
          409,
          "ACTIVE_INVITE_EXISTS",
          "Er is al een actieve uitnodiging voor dit e-mailadres",
        );
      }
      const { rawCode, codeHash } = await createUniqueInviteCode();
      const invite = await prisma.invite.create({
        data: {
          email: normalizedEmail,
          codeHash,
          createdByAdminId: getRealAccountId(request),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await sendInviteEmail(
        request.log,
        env,
        invite.email,
        inviteUrl(env.PUBLIC_APP_URL, rawCode),
        rawCode,
      );
      return reply.code(201).send(ok({ invite: inviteJson(invite) }));
    });

    app.post("/invites/:id/resend", async (request, reply) => {
      const { id } = parseParams(idParams, request.params);
      const invite = await prisma.invite.findUnique({ where: { id } });
      if (!invite) {
        throw new HttpError(404, "NOT_FOUND", "Uitnodiging niet gevonden");
      }
      if (invite.usedAt || invite.revokedAt || invite.expiresAt <= new Date()) {
        throw new HttpError(
          400,
          "INVITE_NOT_ACTIVE",
          "Alleen actieve uitnodigingen kunnen opnieuw worden verstuurd",
        );
      }
      const { rawCode, codeHash } = await createUniqueInviteCode();
      const updated = await prisma.invite.update({
        where: { id: invite.id },
        data: { codeHash },
      });
      await sendInviteEmail(
        request.log,
        env,
        updated.email,
        inviteUrl(env.PUBLIC_APP_URL, rawCode),
        rawCode,
      );
      return reply.send(ok({ invite: inviteJson(updated) }));
    });

    app.post("/invites/:id/revoke", async (request, reply) => {
      const { id } = parseParams(idParams, request.params);
      const invite = await prisma.invite.findUnique({ where: { id } });
      if (!invite) {
        throw new HttpError(404, "NOT_FOUND", "Uitnodiging niet gevonden");
      }
      if (invite.usedAt) {
        throw new HttpError(
          400,
          "INVITE_ALREADY_USED",
          "Een gebruikte uitnodiging kan niet worden ingetrokken",
        );
      }
      const updated = await prisma.invite.update({
        where: { id: invite.id },
        data: { revokedAt: invite.revokedAt ?? new Date() },
      });
      return reply.send(ok({ invite: inviteJson(updated) }));
    });

    app.get("/users", async (_request, reply) => {
      // Alle accounts tonen (USER en ADMIN). Alleen USER is te impersonaten.
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });
      return reply.send(ok({ users: users.map(userJson) }));
    });

    app.post("/users/:id/impersonate", async (request, reply) => {
      const { id } = parseParams(idParams, request.params);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || user.role !== AccountRole.USER) {
        throw new HttpError(404, "NOT_FOUND", "Gebruiker niet gevonden");
      }
      await setSessionCookie(reply, {
        sub: getRealAccountId(request),
        role: AccountRole.ADMIN,
        impersonatingUserId: user.id,
      });
      return reply.send(ok({ ok: true as const }));
    });

    app.post("/impersonation/stop", async (request, reply) => {
      await setSessionCookie(reply, {
        sub: getRealAccountId(request),
        role: AccountRole.ADMIN,
      });
      return reply.send(ok({ ok: true as const }));
    });
  };
}
