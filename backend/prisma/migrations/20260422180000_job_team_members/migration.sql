-- CreateTable
CREATE TABLE "job_team_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_team_members_job_id_worker_id_key" ON "job_team_members"("job_id", "worker_id");

-- CreateIndex
CREATE INDEX "job_team_members_user_id_idx" ON "job_team_members"("user_id");

-- CreateIndex
CREATE INDEX "job_team_members_job_id_idx" ON "job_team_members"("job_id");

-- AddForeignKey
ALTER TABLE "job_team_members" ADD CONSTRAINT "job_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_team_members" ADD CONSTRAINT "job_team_members_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_team_members" ADD CONSTRAINT "job_team_members_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: iedereen met minstens één inplanning hoort op het projectteam
INSERT INTO "job_team_members" ("id", "user_id", "job_id", "worker_id", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  s."userId",
  s."jobId",
  s."workerId",
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM "ScheduleAssignment" s
GROUP BY s."userId", s."jobId", s."workerId"
ON CONFLICT ("job_id", "worker_id") DO NOTHING;
