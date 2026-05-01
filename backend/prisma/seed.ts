import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { JobStatus, TaskStatus, WorkerAvailabilityStatus } from "@prisma/client";

const prisma = new PrismaClient();

/** Demo login: `demo@finbar.local` / `demo-password-123` */
const DEMO_PASSWORD = "demo-password-123";

async function main() {
  await prisma.user.deleteMany({ where: { email: "demo@finbar.local" } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      email: "demo@finbar.local",
      passwordHash,
      firstName: "Demo",
      lastName: "",
    },
  });

  const w1 = await prisma.worker.create({
    data: {
      userId: user.id,
      firstName: "Jan",
      lastName: "de Vries",
      trades: ["Tegelzetter"],
    },
  });

  const w2 = await prisma.worker.create({
    data: {
      userId: user.id,
      firstName: "Piet",
      lastName: "Jansen",
      trades: ["Stucadoor"],
    },
  });

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      name: "Prinsengracht badkamer",
      address: "Prinsengracht 1, Amsterdam",
      status: JobStatus.ACTIVE,
    },
  });

  await prisma.jobTeamMember.createMany({
    data: [
      { userId: user.id, jobId: job.id, workerId: w1.id },
      { userId: user.id, jobId: job.id, workerId: w2.id },
    ],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWed = new Date(today);
  nextWed.setDate(nextWed.getDate() + ((3 + 7 - nextWed.getDay()) % 7 || 7));

  await prisma.workerAvailability.createMany({
    data: [
      {
        userId: user.id,
        workerId: w1.id,
        date: nextWed,
        status: WorkerAvailabilityStatus.UNAVAILABLE,
        notes: "papadag (voorbeeld)",
      },
      {
        userId: user.id,
        workerId: w1.id,
        date: today,
        status: WorkerAvailabilityStatus.AVAILABLE,
        notes: null,
      },
    ],
  });

  await prisma.scheduleAssignment.create({
    data: {
      userId: user.id,
      workerId: w2.id,
      jobId: job.id,
      date: today,
      notes: null,
    },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      jobId: job.id,
      title: "Tegels lijmen",
      status: TaskStatus.OPEN,
      scheduledDate: today,
      assignees: {
        create: [{ workerId: w1.id }],
      },
    },
  });

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      largeTextMode: false,
      preferredView: "week",
    },
  });

  console.log(
    "Seed OK: demo@finbar.local / demo-password-123 — workers, job, availability, assignment, task.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
