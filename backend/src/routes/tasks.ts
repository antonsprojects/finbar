import type { FastifyPluginAsync } from "fastify";
import { Prisma, TaskStatus, type Task } from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { HttpError } from "../lib/http-error.js";
import { listResponse, paginationQuerySchema } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { workerDisplayName } from "../lib/workerName.js";
import { parseBody, parseQuery } from "../lib/validate.js";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Verwacht formaat JJJJ-MM-DD");

const taskListQuerySchema = paginationQuerySchema.extend({
  jobId: z.string().min(1).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  scheduledDate: dateOnly.optional(),
});

const createTaskBody = z.object({
  jobId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  scheduledDate: dateOnly.nullable().optional(),
  assignedWorkerIds: z.array(z.string().min(1)).optional(),
  /** Begrotingsregel: max. één taak per project/dag/regel. */
  budgetLineId: z.string().min(1).optional(),
});

const updateTaskBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  scheduledDate: dateOnly.nullable().optional(),
  assignedWorkerIds: z.array(z.string().min(1)).optional(),
});

const idParams = z.object({
  id: z.string().min(1),
});

function dateOnlyToUtcNoon(s: string): Date {
  return new Date(`${s}T12:00:00.000Z`);
}

/** Zelfde dag-normalisatie als `schedule-assignments` (kolom `date` @db.Date). */
function scheduleDateFromYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * Teamleden op een taak ook op de planning (ScheduleAssignment) voor die dag zetten.
 * Alleen toevoegen als de dag-tabel nog geen regel had; geen automatische verwijdering.
 */
async function ensureScheduleAssignmentsForTaskDay(
  userId: string,
  jobId: string,
  dateYmd: string,
  workerIds: string[],
): Promise<void> {
  if (workerIds.length === 0) return;
  const day = scheduleDateFromYmd(dateYmd);
  for (const workerId of workerIds) {
    const found = await prisma.scheduleAssignment.findFirst({
      where: { userId, jobId, workerId, date: day },
    });
    if (found) continue;
    try {
      await prisma.scheduleAssignment.create({
        data: { userId, jobId, workerId, date: day, notes: null },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        continue;
      }
      throw e;
    }
  }
}

type TaskWithAssignees = Task & {
  assignees: {
    workerId: string;
    worker: { id: string; firstName: string; lastName: string };
  }[];
};

const assigneeInclude = {
  assignees: {
    orderBy: [
      { worker: { firstName: "asc" as const } },
      { worker: { lastName: "asc" as const } },
    ],
    include: { worker: { select: { id: true, firstName: true, lastName: true } } },
  },
} satisfies Prisma.TaskInclude;

function taskJson(t: TaskWithAssignees) {
  const assignedWorkerIds = t.assignees.map((a) => a.workerId);
  const assignedWorkers = t.assignees.map((a) => ({
    id: a.worker.id,
    name: workerDisplayName(a.worker),
  }));
  return {
    id: t.id,
    userId: t.userId,
    jobId: t.jobId,
    budgetLineId: t.budgetLineId,
    title: t.title,
    description: t.description,
    status: t.status,
    scheduledDate: t.scheduledDate
      ? t.scheduledDate.toISOString().slice(0, 10)
      : null,
    assignedWorkerIds,
    assignedWorkers,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
  };
}

type TaskWithJob = TaskWithAssignees & {
  job?: { id: string; name: string };
};

function listTaskJson(t: TaskWithJob) {
  const base = taskJson(t);
  if (t.job) {
    return { ...base, job: { id: t.job.id, name: t.job.name } };
  }
  return base;
}

async function assertWorkersBelongToUser(
  userId: string,
  workerIds: string[],
): Promise<void> {
  if (workerIds.length === 0) return;
  const unique = [...new Set(workerIds)];
  const count = await prisma.worker.count({
    where: { userId, id: { in: unique } },
  });
  if (count !== unique.length) {
    throw new HttpError(400, "VALIDATION_ERROR", "Ongeldige teamleden");
  }
}

async function assertWorkersOnProjectTeam(
  userId: string,
  jobId: string,
  workerIds: string[],
): Promise<void> {
  if (workerIds.length === 0) return;
  const unique = [...new Set(workerIds)];
  const members = await prisma.jobTeamMember.findMany({
    where: { userId, jobId, workerId: { in: unique } },
    select: { workerId: true },
  });
  const have = new Set(members.map((m) => m.workerId));
  for (const id of unique) {
    if (!have.has(id)) {
      throw new HttpError(
        400,
        "TEAM_FIRST",
        "Alleen teamleden die al op het project staan, kunnen op een to-do worden gezet. Voeg iemand eerst toe via Team.",
      );
    }
  }
}

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const userId = request.user.sub;
    const q = parseQuery(taskListQuerySchema, request.query);
    const where: Prisma.TaskWhereInput = {
      userId,
      ...(q.jobId !== undefined ? { jobId: q.jobId } : {}),
      ...(q.status !== undefined ? { status: q.status } : {}),
      ...(q.scheduledDate !== undefined
        ? {
            scheduledDate: {
              equals: new Date(`${q.scheduledDate}T00:00:00.000Z`),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ scheduledDate: "asc" }, { updatedAt: "desc" }],
        take: q.limit,
        skip: q.offset,
        include: {
          job: { select: { id: true, name: true } },
          ...assigneeInclude,
        },
      }),
      prisma.task.count({ where }),
    ]);
    return reply.send(
      listResponse(
        rows.map((r) => listTaskJson(r as TaskWithJob)),
        { limit: q.limit, offset: q.offset, total },
      ),
    );
  });

  app.post("/", async (request, reply) => {
    const userId = request.user.sub;
    const body = parseBody(createTaskBody, request.body);

    const job = await prisma.job.findFirst({
      where: { id: body.jobId, userId },
    });
    if (!job) {
      throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
    }

    const ids = body.assignedWorkerIds ?? [];
    await assertWorkersBelongToUser(userId, ids);
    await assertWorkersOnProjectTeam(userId, body.jobId, ids);

    let budgetLineId: string | null = null;
    if (body.budgetLineId !== undefined) {
      const line = await prisma.budgetLine.findFirst({
        where: { id: body.budgetLineId },
        include: { phase: { select: { jobId: true } } },
      });
      if (!line || line.phase.jobId !== body.jobId) {
        throw new HttpError(400, "VALIDATION_ERROR", "Ongeldige begrotingsregel");
      }
      if (!body.scheduledDate) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          "Kies een planningsdatum om een ToDo uit de begroting te koppelen",
        );
      }
      const day = dateOnlyToUtcNoon(body.scheduledDate);
      const duplicate = await prisma.task.findFirst({
        where: {
          userId,
          jobId: body.jobId,
          scheduledDate: day,
          budgetLineId: line.id,
        },
      });
      if (duplicate) {
        throw new HttpError(
          409,
          "BUDGET_LINE_TAKEN",
          "Deze ToDo staat al op deze dag",
        );
      }
      budgetLineId = line.id;
    }

    const status = body.status ?? TaskStatus.OPEN;
    let task: TaskWithAssignees;
    try {
      task = await prisma.task.create({
        data: {
          userId,
          jobId: body.jobId,
          budgetLineId,
          title: body.title,
          description: body.description ?? null,
          status,
          scheduledDate: body.scheduledDate
            ? dateOnlyToUtcNoon(body.scheduledDate)
            : null,
          completedAt: status === TaskStatus.DONE ? new Date() : null,
          ...(ids.length > 0
            ? {
                assignees: {
                  create: ids.map((workerId) => ({ workerId })),
                },
              }
            : {}),
        },
        include: assigneeInclude,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new HttpError(
          409,
          "BUDGET_LINE_TAKEN",
          "Deze ToDo staat al op deze dag",
        );
      }
      throw e;
    }
    if (body.scheduledDate && ids.length > 0) {
      await ensureScheduleAssignmentsForTaskDay(
        userId,
        body.jobId,
        body.scheduledDate,
        ids,
      );
    }
    return reply.code(201).send(ok({ task: taskJson(task as TaskWithAssignees) }));
  });

  app.get("/:id", async (request, reply) => {
    const userId = request.user.sub;
    const { id } = parseBody(idParams, request.params);
    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: {
        job: { select: { id: true, name: true } },
        ...assigneeInclude,
      },
    });
    if (!task) {
      throw new HttpError(404, "NOT_FOUND", "Taak niet gevonden");
    }
    const { job, ...rest } = task;
    const payload = listTaskJson({ ...rest, job: job ?? undefined } as TaskWithJob);
    return reply.send(ok({ task: payload }));
  });

  app.patch("/:id", async (request, reply) => {
    const userId = request.user.sub;
    const { id } = parseBody(idParams, request.params);
    const body = parseBody(updateTaskBody, request.body);
    const keys = Object.keys(body) as (keyof typeof body)[];
    if (keys.length === 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "Geen velden om bij te werken");
    }

    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Taak niet gevonden");
    }

    if (body.assignedWorkerIds !== undefined) {
      await assertWorkersBelongToUser(userId, body.assignedWorkerIds);
      await assertWorkersOnProjectTeam(
        userId,
        existing.jobId,
        body.assignedWorkerIds,
      );
    }

    let completedAt = existing.completedAt;
    if (body.status !== undefined) {
      if (body.status === TaskStatus.DONE) {
        completedAt = new Date();
      } else {
        completedAt = null;
      }
    }

    const hasScalarUpdate =
      body.title !== undefined ||
      body.description !== undefined ||
      body.status !== undefined ||
      body.scheduledDate !== undefined;

    const task = await prisma.$transaction(async (tx) => {
      if (body.assignedWorkerIds !== undefined) {
        await tx.taskAssignee.deleteMany({ where: { taskId: id } });
        if (body.assignedWorkerIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: body.assignedWorkerIds.map((workerId) => ({
              taskId: id,
              workerId,
            })),
          });
        }
      }

      if (hasScalarUpdate) {
        return tx.task.update({
          where: { id },
          data: {
            ...(body.title !== undefined ? { title: body.title } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.status !== undefined ? { status: body.status } : {}),
            ...(body.scheduledDate !== undefined
              ? {
                  scheduledDate: body.scheduledDate
                    ? dateOnlyToUtcNoon(body.scheduledDate)
                    : null,
                }
              : {}),
            ...(body.status !== undefined ? { completedAt } : {}),
          },
          include: assigneeInclude,
        });
      }

      return tx.task.findFirstOrThrow({
        where: { id },
        include: assigneeInclude,
      });
    });

    const t = task as TaskWithAssignees;
    if (t.scheduledDate) {
      const ymd = t.scheduledDate.toISOString().slice(0, 10);
      const assigneeIds = t.assignees.map((a) => a.workerId);
      if (assigneeIds.length > 0) {
        await ensureScheduleAssignmentsForTaskDay(
          userId,
          t.jobId,
          ymd,
          assigneeIds,
        );
      }
    }

    return reply.send(ok({ task: taskJson(task as TaskWithAssignees) }));
  });

  app.delete("/:id", async (request, reply) => {
    const userId = request.user.sub;
    const { id } = parseBody(idParams, request.params);

    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Taak niet gevonden");
    }

    await prisma.task.delete({ where: { id } });
    return reply.code(204).send();
  });
};
