-- CreateTable
CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignee_taskId_workerId_key" ON "TaskAssignee"("taskId", "workerId");

CREATE INDEX "TaskAssignee_taskId_idx" ON "TaskAssignee"("taskId");

CREATE INDEX "TaskAssignee_workerId_idx" ON "TaskAssignee"("workerId");

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single assignee
INSERT INTO "TaskAssignee" ("id", "taskId", "workerId", "createdAt")
SELECT gen_random_uuid()::text, "id", "assignedWorkerId", CURRENT_TIMESTAMP
FROM "Task"
WHERE "assignedWorkerId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedWorkerId_fkey";

-- DropIndex
DROP INDEX "Task_assignedWorkerId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "assignedWorkerId";
