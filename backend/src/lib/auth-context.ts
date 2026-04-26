import type { AccountRole } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HttpError } from "./http-error.js";

export const AUTH_COOKIE = "finbar_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  role: AccountRole;
  impersonatingUserId?: string;
};

export function getEffectiveUserId(request: FastifyRequest): string {
  return request.user.impersonatingUserId ?? request.user.sub;
}

export function getRealAccountId(request: FastifyRequest): string {
  return request.user.sub;
}

export function requireAdmin(request: FastifyRequest): void {
  if (request.user.role !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "Alleen beheerders hebben toegang");
  }
}

export async function setSessionCookie(
  reply: FastifyReply,
  payload: SessionPayload,
): Promise<void> {
  const token = await reply.jwtSign(payload);
  reply.setCookie(AUTH_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
}
