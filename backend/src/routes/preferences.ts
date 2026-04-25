import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { HttpError } from "../lib/http-error.js";
import { preferenceJson } from "../lib/user-preference-json.js";
import { prisma } from "../lib/prisma.js";
import { parseBody } from "../lib/validate.js";

const patchBody = z.object({
  largeTextMode: z.boolean().optional(),
  preferredView: z.string().max(100).nullable().optional(),
});

async function ensurePreference(userId: string) {
  const existing = await prisma.userPreference.findUnique({
    where: { userId },
  });
  if (existing) {
    return existing;
  }
  return prisma.userPreference.create({
    data: { userId, largeTextMode: false },
  });
}

export const preferenceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const userId = request.user.sub;
    const p = await ensurePreference(userId);
    return reply.send(ok({ preference: preferenceJson(p) }));
  });

  app.patch("/", async (request, reply) => {
    const userId = request.user.sub;
    const body = parseBody(patchBody, request.body);
    const keys = Object.keys(body) as (keyof typeof body)[];
    if (keys.length === 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "Geen velden om bij te werken");
    }

    await ensurePreference(userId);

    const p = await prisma.userPreference.update({
      where: { userId },
      data: {
        ...(body.largeTextMode !== undefined
          ? { largeTextMode: body.largeTextMode }
          : {}),
        ...(body.preferredView !== undefined
          ? { preferredView: body.preferredView }
          : {}),
      },
    });
    return reply.send(ok({ preference: preferenceJson(p) }));
  });
};
