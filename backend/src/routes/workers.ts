import type { FastifyPluginAsync } from "fastify";
import {
  JobStatus,
  WorkerAvailabilityStatus,
  type Worker,
} from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { getEffectiveUserId } from "../lib/auth-context.js";
import { HttpError } from "../lib/http-error.js";
import { listResponse, paginationQuerySchema } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import {
  WORKER_TRADE_MAX_LEN,
  WORKER_TRADES_MAX_COUNT,
  normalizeWorkerTradesInput,
} from "../lib/workerTrades.js";
import { buildTeamDisplayRule } from "../lib/workerTeamDisplay.js";
import { workerDisplayName } from "../lib/workerName.js";
import { parseBody, parseQuery } from "../lib/validate.js";

const tradesSchema = z
  .array(z.string().max(WORKER_TRADE_MAX_LEN))
  .max(WORKER_TRADES_MAX_COUNT)
  .optional();

const createWorkerBody = z.object({
  firstName: z.string().min(1).max(200),
  lastName: z.string().max(200).optional().default(""),
  trades: tradesSchema,
  notes: z.string().max(10000).nullable().optional(),
});

const updateWorkerBody = z.object({
  firstName: z.string().min(1).max(200).optional(),
  lastName: z.string().max(200).optional(),
  trades: tradesSchema,
  notes: z.string().max(10000).nullable().optional(),
});

const idParams = z.object({
  id: z.string().min(1),
});

const workerAndJobParams = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
});

const teamDisplayQuery = z.object({
  /** Komma-gescheiden teamlid-ids, max. 100. */
  workerIds: z.string().min(1),
});

function workerJson(w: Worker) {
  return {
    id: w.id,
    userId: w.userId,
    firstName: w.firstName,
    lastName: w.lastName,
    name: workerDisplayName(w),
    trades: [...w.trades],
    notes: w.notes,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export const workerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const q = parseQuery(paginationQuerySchema, request.query);
    const where = { userId };
    const [rows, total] = await Promise.all([
      prisma.worker.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        take: q.limit,
        skip: q.offset,
      }),
      prisma.worker.count({ where }),
    ]);
    return reply.send(
      listResponse(
        rows.map(workerJson),
        { limit: q.limit, offset: q.offset, total },
      ),
    );
  });

  app.get("/team-display-rules", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const q = parseQuery(teamDisplayQuery, request.query);
    const rawIds = q.workerIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const uniqueIds = [...new Set(rawIds)].slice(0, 100);
    if (uniqueIds.length === 0) {
      return reply.send(ok({ rules: {} }));
    }
    const allowed = await prisma.worker.findMany({
      where: { userId, id: { in: uniqueIds } },
      select: { id: true },
    });
    const ids = allowed.map((w) => w.id);
    if (ids.length === 0) {
      return reply.send(ok({ rules: {} }));
    }

    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setFullYear(to.getFullYear() + 2);

    const [periods, unavail] = await Promise.all([
      prisma.workerAvailabilityPeriod.findMany({
        where: { userId, workerId: { in: ids } },
        orderBy: [{ dateFrom: "asc" }, { id: "asc" }],
      }),
      prisma.workerAvailability.findMany({
        where: {
          userId,
          workerId: { in: ids },
          status: WorkerAvailabilityStatus.UNAVAILABLE,
          date: { gte: from, lte: to },
        },
        orderBy: [{ date: "asc" }, { id: "asc" }],
      }),
    ]);

    const byWorkerP = new Map<string, (typeof periods)[number][]>();
    const byWorkerU = new Map<string, (typeof unavail)[number][]>();
    for (const id of ids) {
      byWorkerP.set(id, []);
      byWorkerU.set(id, []);
    }
    for (const p of periods) {
      byWorkerP.get(p.workerId)?.push(p);
    }
    for (const u of unavail) {
      byWorkerU.get(u.workerId)?.push(u);
    }

    const rules: Record<
      string,
      { availability: string | null; absence: string[] }
    > = {};
    for (const id of ids) {
      rules[id] = buildTeamDisplayRule(
        byWorkerP.get(id) ?? [],
        byWorkerU.get(id) ?? [],
      );
    }
    return reply.send(ok({ rules }));
  });

  /**
   * Projecten waar dit teamlid op het projectteam stond/staat;
   * `assignmentCount` = aantal ingeplande dagen (kan 0 zijn als alleen team, geen dagen).
   * `job.status` is nodig om actieve vs archief in de UI te scheiden.
   */
  app.get("/:id/schedule-jobs", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);
    const worker = await prisma.worker.findFirst({
      where: { id, userId },
    });
    if (!worker) {
      throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
    }
    const [teamRows, groups] = await Promise.all([
      prisma.jobTeamMember.findMany({
        where: { userId, workerId: id },
        select: { jobId: true },
      }),
      prisma.scheduleAssignment.groupBy({
        by: ["jobId"],
        where: { userId, workerId: id },
        _count: { _all: true },
      }),
    ]);
    const countByJob = new Map(
      groups.map((g) => [g.jobId, g._count._all] as const),
    );
    const jobIdSet = new Set<string>([
      ...teamRows.map((r) => r.jobId),
      ...groups.map((g) => g.jobId),
    ]);
    if (jobIdSet.size === 0) {
      return reply.send(ok({ jobs: [] }));
    }
    const jobIds = [...jobIdSet];
    const jobRows = await prisma.job.findMany({
      where: { userId, id: { in: jobIds } },
      select: { id: true, name: true, status: true },
    });
    const byId = new Map(jobRows.map((j) => [j.id, j]));
    const items = jobIds
      .map((jobId) => {
        const j = byId.get(jobId);
        if (!j) {
          return null;
        }
        return {
          job: { id: j.id, name: j.name, status: j.status },
          assignmentCount: countByJob.get(jobId) ?? 0,
        };
      })
      .filter(
        (x): x is {
          job: { id: string; name: string; status: JobStatus };
          assignmentCount: number;
        } => x !== null,
      )
      .sort((a, b) => a.job.name.localeCompare(b.job.name, "nl", { sensitivity: "base" }));
    return reply.send(ok({ jobs: items }));
  });

  /**
   * Verwijdert teamlidmaatschap op het project. Alleen als er nog geen
   * inplanningen op dit project zijn (0 dagen); anders 400.
   */
  app.delete("/:id/schedule-jobs/:jobId", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id, jobId } = parseBody(workerAndJobParams, request.params);
    const [worker, job] = await Promise.all([
      prisma.worker.findFirst({ where: { id, userId } }),
      prisma.job.findFirst({ where: { id: jobId, userId } }),
    ]);
    if (!worker) {
      throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
    }
    if (!job) {
      throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
    }
    const assignmentCount = await prisma.scheduleAssignment.count({
      where: { userId, workerId: id, jobId },
    });
    if (assignmentCount > 0) {
      throw new HttpError(
        400,
        "HAS_SCHEDULE_DAYS",
        "Verwijder eerst alle ingeplande dagen voor dit project voordat je het teamlid van het project haalt.",
      );
    }
    const teamResult = await prisma.jobTeamMember.deleteMany({
      where: { userId, workerId: id, jobId },
    });
    return reply.send(ok({ deleted: teamResult.count }));
  });

  app.post("/", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const body = parseBody(createWorkerBody, request.body);
    const worker = await prisma.worker.create({
      data: {
        userId,
        firstName: body.firstName,
        lastName: body.lastName,
        trades: normalizeWorkerTradesInput(body.trades ?? []),
        notes: body.notes ?? null,
      },
    });
    return reply.code(201).send(ok({ worker: workerJson(worker) }));
  });

  app.get("/:id", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);
    const worker = await prisma.worker.findFirst({
      where: { id, userId },
    });
    if (!worker) {
      throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
    }
    return reply.send(ok({ worker: workerJson(worker) }));
  });

  app.patch("/:id", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);
    const body = parseBody(updateWorkerBody, request.body);
    const keys = Object.keys(body) as (keyof typeof body)[];
    if (keys.length === 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "Geen velden om bij te werken");
    }
    const existing = await prisma.worker.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
    }
    const worker = await prisma.worker.update({
      where: { id },
      data: {
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.trades !== undefined
          ? { trades: normalizeWorkerTradesInput(body.trades) }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    return reply.send(ok({ worker: workerJson(worker) }));
  });
};
