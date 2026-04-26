import type { FastifyPluginAsync } from "fastify";
import { JobStatus, type Job } from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { getEffectiveUserId } from "../lib/auth-context.js";
import { HttpError } from "../lib/http-error.js";
import { listResponse, paginationQuerySchema } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { parseBody, parseQuery } from "../lib/validate.js";
import { begrotingRoutes } from "./begroting.js";

const jobListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(JobStatus).optional(),
});

const createJobBody = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  status: z.nativeEnum(JobStatus).optional(),
});

const updateJobBody = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  status: z.nativeEnum(JobStatus).optional(),
});

const idParams = z.object({
  id: z.string().min(1),
});

function jobJson(job: Job) {
  return {
    id: job.id,
    userId: job.userId,
    name: job.name,
    address: job.address,
    status: job.status,
    notes: job.notes,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export const jobRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  await app.register(begrotingRoutes);

  app.get("/", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const q = parseQuery(jobListQuerySchema, request.query);
    const where = {
      userId,
      ...(q.status !== undefined ? { status: q.status } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: q.limit,
        skip: q.offset,
      }),
      prisma.job.count({ where }),
    ]);
    return reply.send(
      listResponse(
        rows.map(jobJson),
        { limit: q.limit, offset: q.offset, total },
      ),
    );
  });

  app.post("/", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const body = parseBody(createJobBody, request.body);
    const job = await prisma.job.create({
      data: {
        userId,
        name: body.name,
        address: body.address ?? null,
        notes: body.notes ?? null,
        status: body.status ?? JobStatus.PLANNING,
      },
    });
    return reply.code(201).send(ok({ job: jobJson(job) }));
  });

  /** Nemen deel aan het projectteam (los van of ze al op een dag ingepland zijn). */
  app.get("/:id/scheduled-workers", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);
    const job = await prisma.job.findFirst({
      where: { id, userId },
    });
    if (!job) {
      throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
    }
    const rows = await prisma.jobTeamMember.findMany({
      where: { userId, jobId: id },
      select: { workerId: true },
    });
    return reply.send(
      ok({ workerIds: rows.map((r) => r.workerId) }),
    );
  });

  app.get("/:id", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);
    const job = await prisma.job.findFirst({
      where: { id, userId },
    });
    if (!job) {
      throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
    }
    return reply.send(ok({ job: jobJson(job) }));
  });

  app.patch("/:id", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);
    const body = parseBody(updateJobBody, request.body);
    const keys = Object.keys(body) as (keyof typeof body)[];
    if (keys.length === 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "Geen velden om bij te werken");
    }
    const existing = await prisma.job.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
    }
    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });
    return reply.send(ok({ job: jobJson(job) }));
  });
};
