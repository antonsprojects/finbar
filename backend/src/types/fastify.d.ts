import type { FastifyReply, FastifyRequest } from "fastify";
import type { AccountRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: AccountRole; impersonatingUserId?: string };
    user: { sub: string; role: AccountRole; impersonatingUserId?: string };
  }
}
