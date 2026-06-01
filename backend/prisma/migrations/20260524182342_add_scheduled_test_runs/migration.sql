-- CreateEnum
CREATE TYPE "ScheduledTestRunStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateTable
CREATE TABLE "ScheduledTestRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ScheduledTestRunStatus" NOT NULL DEFAULT 'ACTIVE',
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Tunis',
    "targetUrl" TEXT,
    "browser" "BrowserTarget",
    "environment" TEXT,
    "variables" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastExecutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledTestRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledTestRun_projectId_idx" ON "ScheduledTestRun"("projectId");

-- CreateIndex
CREATE INDEX "ScheduledTestRun_workItemId_idx" ON "ScheduledTestRun"("workItemId");

-- CreateIndex
CREATE INDEX "ScheduledTestRun_scriptId_idx" ON "ScheduledTestRun"("scriptId");

-- CreateIndex
CREATE INDEX "ScheduledTestRun_createdById_idx" ON "ScheduledTestRun"("createdById");

-- CreateIndex
CREATE INDEX "ScheduledTestRun_status_idx" ON "ScheduledTestRun"("status");

-- CreateIndex
CREATE INDEX "ScheduledTestRun_nextRunAt_idx" ON "ScheduledTestRun"("nextRunAt");

-- AddForeignKey
ALTER TABLE "ScheduledTestRun" ADD CONSTRAINT "ScheduledTestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTestRun" ADD CONSTRAINT "ScheduledTestRun_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTestRun" ADD CONSTRAINT "ScheduledTestRun_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "AutomationScript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTestRun" ADD CONSTRAINT "ScheduledTestRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
