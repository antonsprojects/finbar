import type { FastifyPluginAsync } from "fastify";
import {
  WorkerAvailabilityPeriodKind,
  type WorkerAvailabilityPeriod,
} from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { HttpError } from "../lib/http-error.js";
import { listResponse, paginationQuerySchema } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { parseBody, parseQuery } from "../lib/validate.js";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Verwacht formaat JJJJ-MM-DD");

const listQuerySchema = paginationQuerySchema.extend({
  workerId: z.string().min(1),
});

const createBody = z
  .object({
    workerId: z.string().min(1),
    dateFrom: dateOnly,
    /** Deeltijd: verplicht. Vaste dienst: weglaten of `null` = onbepaand. */
    dateTo: z.union([dateOnly, z.null()]).optional(),
    kind: z.nativeEnum(WorkerAvailabilityPeriodKind),
    notes: z.string().max(10000).nullable().optional(),
  })
  .superRefine((b, ctx) => {
    if (b.kind === WorkerAvailabilityPeriodKind.PART_TIME) {
      if (b.dateTo == null) {
        ctx.addIssue({
          code: "custom",
          message: "Deeltijd: vul een einddatum in",
          path: ["dateTo"],
        });
        return;
      }
      if (b.dateFrom > b.dateTo) {
        ctx.addIssue({
          code: "custom",
          message: "De begindatum moet op of vóór de einddatum liggen",
          path: ["dateTo"],
        });
      }
    } else if (b.dateTo != null && b.dateFrom > b.dateTo) {
      ctx.addIssue({
        code: "custom",
        message: "De begindatum moet op of vóór de einddatum liggen",
        path: ["dateTo"],
      });
    }
  });

const idParams = z.object({
  id: z.string().min(1),
});

function dateAtUtcMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function periodJson(p: WorkerAvailabilityPeriod) {
  return {
    id: p.id,
    userId: p.userId,
    workerId: p.workerId,
    dateFrom: p.dateFrom.toISOString().slice(0, 10),
    dateTo: p.dateTo ? p.dateTo.toISOString().slice(0, 10) : null,
    kind: p.kind,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const workerAvailabilityPeriodRoutes: FastifyPluginAsync = async (
  app,
) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const userId = request.user.sub;
    const q = parseQuery(listQuerySchema, request.query);
    const worker = await prisma.worker.findFirst({
      where: { id: q.workerId, userId },
    });
    if (!worker) {
      throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
    }
    const where = { userId, workerId: q.workerId };
    const [rows, total] = await Promise.all([
      prisma.workerAvailabilityPeriod.findMany({
        where,
        orderBy: [{ dateFrom: "asc" }, { id: "asc" }],
        take: q.limit,
        skip: q.offset,
      }),
      prisma.workerAvailabilityPeriod.count({ where }),
    ]);
    return reply.send(
      listResponse(
        rows.map(periodJson),
        { limit: q.limit, offset: q.offset, total },
      ),
    );
  });

  app.post("/", async (request, reply) => {
    const userId = request.user.sub;
    const body = parseBody(createBody, request.body);
    const worker = await prisma.worker.findFirst({
      where: { id: body.workerId, userId },
    });
    if (!worker) {
      throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
    }
    const otherKind =
      body.kind === WorkerAvailabilityPeriodKind.PART_TIME
        ? WorkerAvailabilityPeriodKind.FIXED_SHIFT
        : WorkerAvailabilityPeriodKind.PART_TIME;
    const conflicting = await prisma.workerAvailabilityPeriod.findFirst({
      where: {
        userId,
        workerId: body.workerId,
        kind: otherKind,
      },
    });
    if (conflicting) {
      const msg =
        body.kind === WorkerAvailabilityPeriodKind.PART_TIME
          ? "Verwijder eerst de vaste dienst voordat je deeltijdsperiodes toevoegt."
          : "Verwijder eerst de deeltijdsperiodes voordat je vaste dienst instelt.";
      throw new HttpError(400, "KIND_CONFLICT", msg);
    }
    const from = dateAtUtcMidnight(body.dateFrom);
    const to =
      body.kind === WorkerAvailabilityPeriodKind.PART_TIME
        ? dateAtUtcMidnight(body.dateTo!)
        : body.dateTo == null
          ? null
          : dateAtUtcMidnight(body.dateTo);
    const row = await prisma.workerAvailabilityPeriod.create({
      data: {
        user: { connect: { id: userId } },
        worker: { connect: { id: body.workerId } },
        dateFrom: from,
        dateTo: to,
        kind: body.kind,
        notes: body.notes ?? null,
      },
    });
    return reply.code(201).send(ok({ period: periodJson(row) }));
  });

  app.delete("/:id", async (request, reply) => {
    const userId = request.user.sub;
    const { id } = parseBody(idParams, request.params);
    const existing = await prisma.workerAvailabilityPeriod.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Periode niet gevonden");
    }
    await prisma.workerAvailabilityPeriod.delete({ where: { id } });
    return reply.code(204).send();
  });
};
