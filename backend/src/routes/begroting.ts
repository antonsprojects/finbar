import type { FastifyPluginAsync } from "fastify";
import { Prisma, type BudgetLine, type BudgetPhase } from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { getEffectiveUserId } from "../lib/auth-context.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { parseBody } from "../lib/validate.js";

const jobIdParams = z.object({
  id: z.string().min(1),
});

const phaseIdParams = z.object({
  id: z.string().min(1),
  phaseId: z.string().min(1),
});

const lineIdParams = z.object({
  id: z.string().min(1),
  lineId: z.string().min(1),
});

const createPhaseBody = z.object({
  name: z.string().min(1).max(200),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

const updatePhaseBody = z.object({
  name: z.string().min(1).max(200).optional(),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

const createLineBody = z.object({
  title: z.string().min(1).max(500),
  hours: z.coerce.number().min(0).max(1e9),
  hourlyRate: z.coerce.number().min(0).max(1e9),
  materialsDescription: z.string().max(10000).nullable().optional(),
  materialCost: z.coerce.number().min(0).max(1e9),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

const updateLineBody = z.object({
  title: z.string().min(1).max(500).optional(),
  hours: z.coerce.number().min(0).max(1e9).optional(),
  hourlyRate: z.coerce.number().min(0).max(1e9).optional(),
  materialsDescription: z.string().max(10000).nullable().optional(),
  materialCost: z.coerce.number().min(0).max(1e9).optional(),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

function decStr(n: Prisma.Decimal) {
  return n.toString();
}

function lineJson(line: BudgetLine) {
  return {
    id: line.id,
    phaseId: line.phaseId,
    title: line.title,
    hours: decStr(line.hours),
    hourlyRate: decStr(line.hourlyRate),
    materialsDescription: line.materialsDescription,
    materialCost: decStr(line.materialCost),
    sortOrder: line.sortOrder,
    createdAt: line.createdAt.toISOString(),
    updatedAt: line.updatedAt.toISOString(),
  };
}

function phaseJson(phase: BudgetPhase & { lines: BudgetLine[] }) {
  const lines = [...phase.lines].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  return {
    id: phase.id,
    jobId: phase.jobId,
    name: phase.name,
    sortOrder: phase.sortOrder,
    todos: lines.map(lineJson),
    createdAt: phase.createdAt.toISOString(),
    updatedAt: phase.updatedAt.toISOString(),
  };
}

async function requireJob(
  userId: string,
  jobId: string,
): Promise<{ id: string }> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    select: { id: true },
  });
  if (!job) {
    throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
  }
  return job;
}

export const begrotingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/begroting", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id: jobId } = parseBody(
      jobIdParams,
      request.params as unknown,
    );
    await requireJob(userId, jobId);

    const phases = await prisma.budgetPhase.findMany({
      where: { jobId },
      include: { lines: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return reply.send(
      ok({
        phases: phases.map(phaseJson),
      }),
    );
  });

  app.post("/:id/begroting/phases", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id: jobId } = parseBody(
      jobIdParams,
      request.params as unknown,
    );
    await requireJob(userId, jobId);
    const body = parseBody(createPhaseBody, request.body);

    const last = await prisma.budgetPhase.findFirst({
      where: { jobId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = body.sortOrder ?? (last ? last.sortOrder + 1 : 0);

    const phase = await prisma.budgetPhase.create({
      data: {
        jobId,
        name: body.name,
        sortOrder,
      },
      include: { lines: true },
    });
    return reply.code(201).send(ok({ phase: phaseJson(phase) }));
  });

  app.patch(
    "/:id/begroting/phases/:phaseId",
    async (request, reply) => {
      const userId = getEffectiveUserId(request);
      const { id: jobId, phaseId } = parseBody(
        phaseIdParams,
        request.params,
      );
      await requireJob(userId, jobId);
      const body = parseBody(updatePhaseBody, request.body);
      const keys = Object.keys(body) as (keyof typeof body)[];
      if (keys.length === 0) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          "Geen velden om bij te werken",
        );
      }

      const existing = await prisma.budgetPhase.findFirst({
        where: { id: phaseId, jobId },
      });
      if (!existing) {
        throw new HttpError(404, "NOT_FOUND", "Fase niet gevonden");
      }

      const phase = await prisma.budgetPhase.update({
        where: { id: phaseId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        },
        include: { lines: true },
      });
      return reply.send(ok({ phase: phaseJson(phase) }));
    },
  );

  app.delete(
    "/:id/begroting/phases/:phaseId",
    async (request, reply) => {
      const userId = getEffectiveUserId(request);
      const { id: jobId, phaseId } = parseBody(
        phaseIdParams,
        request.params as unknown,
      );
      await requireJob(userId, jobId);
      const existing = await prisma.budgetPhase.findFirst({
        where: { id: phaseId, jobId },
      });
      if (!existing) {
        throw new HttpError(404, "NOT_FOUND", "Fase niet gevonden");
      }
      await prisma.budgetPhase.delete({ where: { id: phaseId } });
      return reply.code(204).send();
    },
  );

  app.post(
    "/:id/begroting/phases/:phaseId/todos",
    async (request, reply) => {
      const userId = getEffectiveUserId(request);
      const { id: jobId, phaseId } = parseBody(
        phaseIdParams,
        request.params as unknown,
      );
      await requireJob(userId, jobId);
      const body = parseBody(createLineBody, request.body);

      const phase = await prisma.budgetPhase.findFirst({
        where: { id: phaseId, jobId },
      });
      if (!phase) {
        throw new HttpError(404, "NOT_FOUND", "Fase niet gevonden");
      }

      const last = await prisma.budgetLine.findFirst({
        where: { phaseId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      const sortOrder = body.sortOrder ?? (last ? last.sortOrder + 1 : 0);

      const line = await prisma.budgetLine.create({
        data: {
          phaseId,
          title: body.title,
          hours: new Prisma.Decimal(body.hours),
          hourlyRate: new Prisma.Decimal(body.hourlyRate),
          materialsDescription: body.materialsDescription ?? null,
          materialCost: new Prisma.Decimal(body.materialCost),
          sortOrder,
        },
      });
      return reply.code(201).send(ok({ todo: lineJson(line) }));
    },
  );

  app.patch(
    "/:id/begroting/todos/:lineId",
    async (request, reply) => {
      const userId = getEffectiveUserId(request);
      const { id: jobId, lineId } = parseBody(
        lineIdParams,
        request.params as unknown,
      );
      await requireJob(userId, jobId);
      const body = parseBody(updateLineBody, request.body);
      const keys = Object.keys(body) as (keyof typeof body)[];
      if (keys.length === 0) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          "Geen velden om bij te werken",
        );
      }

      const line = await prisma.budgetLine.findFirst({
        where: { id: lineId, phase: { jobId } },
        include: { phase: true },
      });
      if (!line) {
        throw new HttpError(404, "NOT_FOUND", "ToDo niet gevonden");
      }

      const updated = await prisma.budgetLine.update({
        where: { id: lineId },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.hours !== undefined
            ? { hours: new Prisma.Decimal(body.hours) }
            : {}),
          ...(body.hourlyRate !== undefined
            ? { hourlyRate: new Prisma.Decimal(body.hourlyRate) }
            : {}),
          ...(body.materialsDescription !== undefined
            ? { materialsDescription: body.materialsDescription }
            : {}),
          ...(body.materialCost !== undefined
            ? { materialCost: new Prisma.Decimal(body.materialCost) }
            : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        },
      });
      return reply.send(ok({ todo: lineJson(updated) }));
    },
  );

  app.delete(
    "/:id/begroting/todos/:lineId",
    async (request, reply) => {
      const userId = getEffectiveUserId(request);
      const { id: jobId, lineId } = parseBody(
        lineIdParams,
        request.params as unknown,
      );
      await requireJob(userId, jobId);
      const line = await prisma.budgetLine.findFirst({
        where: { id: lineId, phase: { jobId } },
      });
      if (!line) {
        throw new HttpError(404, "NOT_FOUND", "ToDo niet gevonden");
      }
      await prisma.budgetLine.delete({ where: { id: lineId } });
      return reply.code(204).send();
    },
  );
};
