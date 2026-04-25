-- AlterTable
ALTER TABLE "Task" ADD COLUMN "budget_line_id" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Task_budget_line_id_idx" ON "Task"("budget_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "Task_userId_jobId_scheduledDate_budgetLineId_key" ON "Task"("userId", "jobId", "scheduledDate", "budget_line_id");
