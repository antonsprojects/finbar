import type { FastifyPluginAsync } from "fastify";
import {
  Prisma,
  WorkerAvailabilityStatus,
  type WorkerAvailability,
} from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { getEffectiveUserId } from "../lib/auth-context.js";
import { HttpError } from "../lib/http-error.js";
import { listResponse } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { parseBody, parseQuery } from "../lib/validate.js";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Verwacht formaat JJJJ-MM-DD");

const listQuerySchema = z.object({
  from: dateOnly,
  to: dateOnly,
  workerId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
  offset: z.coerce.number().int().min(0).default(0),
});

const upsertBody = z.object({
  workerId: z.string().min(1),
  date: dateOnly,
  status: z.nativeEnum(WorkerAvailabilityStatus),
  notes: z.string().max(10000).nullable().optional(),
});

const idParams = z.object({
  id: z.string().min(1),
});

function dateAtUtcMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function availabilityJson(a: WorkerAvailability) {
  return {
    id: a.id,
    userId: a.userId,
    workerId: a.workerId,
    date: a.date.toISOString().slice(0, 10),
    status: a.status,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export const workerAvailabilityRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const q = parseQuery(listQuerySchema, request.query);
    if (q.from > q.to) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "De begindatum moet op of vóór de einddatum liggen",
      );
    }

    const fromDate = dateAtUtcMidnight(q.from);
    const toDate = dateAtUtcMidnight(q.to);

    const where: Prisma.WorkerAvailabilityWhereInput = {
      userId,
      date: { gte: fromDate, lte: toDate },
      ...(q.workerId !== undefined ? { workerId: q.workerId } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.workerAvailability.findMany({
        where,
        orderBy: [{ date: "asc" }, { workerId: "asc" }],
        take: q.limit,
        skip: q.offset,
      }),
      prisma.workerAvailability.count({ where }),
    ]);

    return reply.send(
      listResponse(
        rows.map(availabilityJson),
        { limit: q.limit, offset: q.offset, total },
      ),
    );
  });

  app.put("/", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const body = parseBody(upsertBody, request.body);

    const worker = await prisma.worker.findFirst({
      where: { id: body.workerId, userId },
    });
    if (!worker) {
      throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
    }

    const day = dateAtUtcMidnight(body.date);

    const row = await prisma.workerAvailability.upsert({
      where: {
        workerId_date: {
          workerId: body.workerId,
          date: day,
        },
      },
      create: {
        userId,
        workerId: body.workerId,
        date: day,
        status: body.status,
        notes: body.notes ?? null,
      },
      update: {
        status: body.status,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    return reply.send(ok({ availability: availabilityJson(row) }));
  });

  app.delete("/:id", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);

    const existing = await prisma.workerAvailability.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Beschikbaarheid niet gevonden");
    }

    await prisma.workerAvailability.delete({ where: { id } });
    return reply.code(204).send();
  });
};
