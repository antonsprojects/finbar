import type { FastifyPluginAsync } from "fastify";
import { Prisma, type ScheduleAssignment } from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { getEffectiveUserId } from "../lib/auth-context.js";
import { HttpError } from "../lib/http-error.js";
import { listResponse } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { workerDisplayName } from "../lib/workerName.js";
import { parseBody, parseQuery } from "../lib/validate.js";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Verwacht formaat JJJJ-MM-DD");

const listQuerySchema = z.object({
  from: dateOnly,
  to: dateOnly,
  workerId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
  offset: z.coerce.number().int().min(0).default(0),
});

const createBody = z.object({
  workerId: z.string().min(1),
  jobId: z.string().min(1),
  date: dateOnly,
  notes: z.string().max(10000).nullable().optional(),
});

const addTeamMemberBody = z.object({
  workerId: z.string().min(1),
  jobId: z.string().min(1),
});

const updateBody = z.object({
  notes: z.string().max(10000).nullable().optional(),
});

const idParams = z.object({
  id: z.string().min(1),
});

function dateAtUtcMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

type RowWithJoins = ScheduleAssignment & {
  job: { id: string; name: string };
  worker: { id: string; firstName: string; lastName: string };
};

function assignmentJson(a: RowWithJoins) {
  return {
    id: a.id,
    userId: a.userId,
    workerId: a.workerId,
    jobId: a.jobId,
    date: a.date.toISOString().slice(0, 10),
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    job: a.job,
    worker: {
      id: a.worker.id,
      name: workerDisplayName(a.worker),
      firstName: a.worker.firstName,
      lastName: a.worker.lastName,
    },
  };
}

const TEAM_FIRST_MESSAGE =
  "Voeg het contact eerst toe aan het projectteam (Team → Aan team toevoegen) voordat je extra dagen inplant.";

async function isWorkerOnProjectTeam(
  userId: string,
  jobId: string,
  workerId: string,
): Promise<boolean> {
  const found = await prisma.jobTeamMember.findFirst({
    where: { userId, jobId, workerId },
    select: { id: true },
  });
  return found !== null;
}

async function createScheduleAssignment(
  userId: string,
  body: z.infer<typeof createBody>,
) {
  const [worker, job] = await Promise.all([
    prisma.worker.findFirst({
      where: { id: body.workerId, userId },
    }),
    prisma.job.findFirst({
      where: { id: body.jobId, userId },
    }),
  ]);
  if (!worker) {
    throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
  }
  if (!job) {
    throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
  }

  const day = dateAtUtcMidnight(body.date);

  try {
    const row = await prisma.scheduleAssignment.create({
      data: {
        userId,
        workerId: body.workerId,
        jobId: body.jobId,
        date: day,
        notes: body.notes ?? null,
      },
      include: {
        job: { select: { id: true, name: true } },
        worker: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return row as RowWithJoins;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "CONFLICT",
        "Dit teamlid is op die dag al ingepland op dit project",
      );
    }
    throw e;
  }
}

export const scheduleAssignmentRoutes: FastifyPluginAsync = async (app) => {
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

    const where: Prisma.ScheduleAssignmentWhereInput = {
      userId,
      date: { gte: fromDate, lte: toDate },
      ...(q.workerId !== undefined ? { workerId: q.workerId } : {}),
      ...(q.jobId !== undefined ? { jobId: q.jobId } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.scheduleAssignment.findMany({
        where,
        orderBy: [{ date: "asc" }, { workerId: "asc" }, { jobId: "asc" }],
        take: q.limit,
        skip: q.offset,
        include: {
          job: { select: { id: true, name: true } },
          worker: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.scheduleAssignment.count({ where }),
    ]);

    return reply.send(
      listResponse(
        rows.map((r) => assignmentJson(r as RowWithJoins)),
        { limit: q.limit, offset: q.offset, total },
      ),
    );
  });

  /** Lid toevoegen aan projectteam, zonder dagmaand (inplanning gebeurt apart). */
  app.post("/initial-on-project", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const body = parseBody(addTeamMemberBody, request.body);

    const [worker, job, existing] = await Promise.all([
      prisma.worker.findFirst({ where: { id: body.workerId, userId } }),
      prisma.job.findFirst({ where: { id: body.jobId, userId } }),
      prisma.jobTeamMember.findFirst({
        where: { userId, jobId: body.jobId, workerId: body.workerId },
      }),
    ]);
    if (!worker) {
      throw new HttpError(404, "NOT_FOUND", "Teamlid niet gevonden");
    }
    if (!job) {
      throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
    }
    if (existing) {
      throw new HttpError(
        409,
        "CONFLICT",
        "Dit teamlid hoort al bij dit project.",
      );
    }

    try {
      const member = await prisma.jobTeamMember.create({
        data: {
          userId,
          jobId: body.jobId,
          workerId: body.workerId,
        },
      });
      return reply.code(201).send(
        ok({
          teamMember: {
            id: member.id,
            jobId: member.jobId,
            workerId: member.workerId,
          },
        }),
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new HttpError(
          409,
          "CONFLICT",
          "Dit teamlid hoort al bij dit project.",
        );
      }
      throw e;
    }
  });

  app.post("/", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const body = parseBody(createBody, request.body);

    const onTeam = await isWorkerOnProjectTeam(
      userId,
      body.jobId,
      body.workerId,
    );
    if (!onTeam) {
      throw new HttpError(400, "TEAM_FIRST", TEAM_FIRST_MESSAGE);
    }

    const row = await createScheduleAssignment(userId, body);
    return reply
      .code(201)
      .send(ok({ assignment: assignmentJson(row) }));
  });

  app.patch("/:id", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);
    const body = parseBody(updateBody, request.body);
    const keys = Object.keys(body) as (keyof typeof body)[];
    if (keys.length === 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "Geen velden om bij te werken");
    }

    const existing = await prisma.scheduleAssignment.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Inplanning niet gevonden");
    }

    const row = await prisma.scheduleAssignment.update({
      where: { id },
      data: {
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: {
        job: { select: { id: true, name: true } },
        worker: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return reply.send(ok({ assignment: assignmentJson(row as RowWithJoins) }));
  });

  app.delete("/:id", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const { id } = parseBody(idParams, request.params);

    const existing = await prisma.scheduleAssignment.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Inplanning niet gevonden");
    }

    await prisma.scheduleAssignment.delete({ where: { id } });
    return reply.code(204).send();
  });
};
