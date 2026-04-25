-- Periodes: deeltijd (datumbereik) of vaste dienst (teamdetail).

CREATE TYPE "WorkerAvailabilityPeriodKind" AS ENUM ('PART_TIME', 'FIXED_SHIFT');

CREATE TABLE "WorkerAvailabilityPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "kind" "WorkerAvailabilityPeriodKind" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerAvailabilityPeriod_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkerAvailabilityPeriod" ADD CONSTRAINT "WorkerAvailabilityPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkerAvailabilityPeriod" ADD CONSTRAINT "WorkerAvailabilityPeriod_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "WorkerAvailabilityPeriod_userId_idx" ON "WorkerAvailabilityPeriod"("userId");
CREATE INDEX "WorkerAvailabilityPeriod_workerId_idx" ON "WorkerAvailabilityPeriod"("workerId");
CREATE INDEX "WorkerAvailabilityPeriod_workerId_dateFrom_idx" ON "WorkerAvailabilityPeriod"("workerId", "dateFrom");
