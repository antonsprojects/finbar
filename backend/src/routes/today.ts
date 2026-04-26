import type { FastifyPluginAsync } from "fastify";
import { JobStatus, TaskStatus, type Task } from "@prisma/client";
import { z } from "zod";
import { ok } from "../lib/api-response.js";
import { getEffectiveUserId } from "../lib/auth-context.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { workerDisplayName } from "../lib/workerName.js";
import { parseQuery } from "../lib/validate.js";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Verwacht formaat JJJJ-MM-DD");

const todayQuerySchema = z.object({
  /** Calendar day (YYYY-MM-DD). Prefer sending the viewer’s local date from the client. */
  date: dateOnly.optional(),
  /** When set, restrict the snapshot to this job (project). */
  jobId: z.string().min(1).optional(),
});

function dateAtUtcMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

type TaskWithJobAssignees = Task & {
  job: { id: string; name: string; status: JobStatus };
  assignees: {
    workerId: string;
    worker: { id: string; firstName: string; lastName: string };
  }[];
};

function taskWithRelationsJson(t: TaskWithJobAssignees) {
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
    job: { id: t.job.id, name: t.job.name },
  };
}

const taskAssigneeInclude = {
  assignees: {
    orderBy: [
      { worker: { firstName: "asc" as const } },
      { worker: { lastName: "asc" as const } },
    ],
    include: { worker: { select: { id: true, firstName: true, lastName: true } } },
  },
} satisfies import("@prisma/client").Prisma.TaskInclude;

const openTaskStatuses: TaskStatus[] = [TaskStatus.OPEN, TaskStatus.IN_PROGRESS];

/** Taken die op de planning nog zichtbaar blijven na voltooien (zelfde dag / achterstallig). */
const visibleTodayTaskStatuses: TaskStatus[] = [
  ...openTaskStatuses,
  TaskStatus.DONE,
];

export const todayRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const userId = getEffectiveUserId(request);
    const q = parseQuery(todayQuerySchema, request.query);
    const dateStr =
      q.date ?? new Date().toISOString().slice(0, 10);
    const day = dateAtUtcMidnight(dateStr);

    if (q.jobId !== undefined) {
      const job = await prisma.job.findFirst({
        where: { id: q.jobId, userId },
      });
      if (!job) {
        throw new HttpError(404, "NOT_FOUND", "Project niet gevonden");
      }
    }

    const jobFilter =
      q.jobId !== undefined ? { jobId: q.jobId } : {};

    const [
      scheduleRows,
      tasksDueToday,
      tasksOverdue,
      tasksUnassigned,
      availabilityRows,
    ] = await Promise.all([
      prisma.scheduleAssignment.findMany({
        where: { userId, date: day, ...jobFilter },
        include: {
          job: true,
          worker: true,
        },
        orderBy: [
          { worker: { firstName: "asc" as const } },
          { worker: { lastName: "asc" as const } },
          { job: { name: "asc" as const } },
        ],
      }),
      prisma.task.findMany({
        where: {
          userId,
          scheduledDate: { equals: day },
          status: { in: visibleTodayTaskStatuses },
          ...jobFilter,
        },
        include: {
          job: { select: { id: true, name: true, status: true } },
          ...taskAssigneeInclude,
        },
        orderBy: [{ scheduledDate: "asc" }, { title: "asc" }],
      }),
      prisma.task.findMany({
        where: {
          userId,
          scheduledDate: { lt: day, not: null },
          status: { in: visibleTodayTaskStatuses },
          ...jobFilter,
        },
        include: {
          job: { select: { id: true, name: true, status: true } },
          ...taskAssigneeInclude,
        },
        orderBy: [{ scheduledDate: "asc" }, { title: "asc" }],
      }),
      prisma.task.findMany({
        where: {
          userId,
          assignees: { none: {} },
          status: { in: openTaskStatuses },
          ...jobFilter,
        },
        include: {
          job: { select: { id: true, name: true, status: true } },
          ...taskAssigneeInclude,
        },
        orderBy: [{ scheduledDate: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.workerAvailability.findMany({
        where: { userId, date: day },
        include: {
          worker: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [
          { worker: { firstName: "asc" as const } },
          { worker: { lastName: "asc" as const } },
        ],
      }),
    ]);

    const crew = scheduleRows.map((s) => ({
      assignmentId: s.id,
      workerId: s.workerId,
      workerName: workerDisplayName(s.worker),
      jobId: s.jobId,
      jobName: s.job.name,
      notes: s.notes,
    }));

    /** Altijd alle rijen voor deze dag: nodig om inplannen-UI te splitsen (kan / niet). */
    const availabilityToday = availabilityRows.map((a) => ({
      workerId: a.workerId,
      workerName: workerDisplayName(a.worker),
      status: a.status,
      notes: a.notes,
    }));

    const unavailableByWorker = new Map(
      availabilityRows
        .filter((a) => a.status === "UNAVAILABLE")
        .map((a) => [a.workerId, a]),
    );

    const jobMap = new Map<
      string,
      { id: string; name: string; status: JobStatus }
    >();
    for (const s of scheduleRows) {
      const j = s.job;
      jobMap.set(j.id, { id: j.id, name: j.name, status: j.status });
    }
    const taskBuckets = [
      ...tasksDueToday,
      ...tasksOverdue,
      ...tasksUnassigned,
    ];
    for (const t of taskBuckets) {
      const j = t.job;
      jobMap.set(j.id, { id: j.id, name: j.name, status: j.status });
    }

    const activeJobs = [...jobMap.values()]
      .filter((j) => j.status === JobStatus.ACTIVE)
      .sort((a, b) => a.name.localeCompare(b.name));

    const scheduleWarnings = scheduleRows
      .filter((s) => unavailableByWorker.has(s.workerId))
      .map((s) => {
        const av = unavailableByWorker.get(s.workerId)!;
        return {
          workerId: s.workerId,
          workerName: workerDisplayName(s.worker),
          jobName: s.job.name,
          availabilityNotes: av.notes,
        };
      });

    return reply.send(
      ok({
        date: dateStr,
        crew,
        availabilityToday,
        activeJobs,
        tasksDueToday: tasksDueToday.map((t) =>
          taskWithRelationsJson(t as TaskWithJobAssignees),
        ),
        tasksOverdue: tasksOverdue.map((t) =>
          taskWithRelationsJson(t as TaskWithJobAssignees),
        ),
        tasksUnassigned: tasksUnassigned.map((t) =>
          taskWithRelationsJson(t as TaskWithJobAssignees),
        ),
        scheduleWarnings,
      }),
    );
  });
};
