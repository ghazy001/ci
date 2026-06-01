-- CreateEnum
CREATE TYPE "AutomationScriptExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'TIMED_OUT', 'CANCELED');

-- CreateTable
CREATE TABLE "AutomationScriptExecution" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "AutomationScriptExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "framework" "AutomationFramework" NOT NULL,
    "browser" "BrowserTarget",
    "targetUrl" TEXT,
    "environment" TEXT,
    "variables" JSONB,
    "command" TEXT,
    "exitCode" INTEGER,
    "stdout" TEXT,
    "stderr" TEXT,
    "logs" JSONB,
    "artifacts" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationScriptExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationScriptExecution_scriptId_idx" ON "AutomationScriptExecution"("scriptId");

-- CreateIndex
CREATE INDEX "AutomationScriptExecution_testCaseId_idx" ON "AutomationScriptExecution"("testCaseId");

-- CreateIndex
CREATE INDEX "AutomationScriptExecution_workItemId_idx" ON "AutomationScriptExecution"("workItemId");

-- CreateIndex
CREATE INDEX "AutomationScriptExecution_requestedById_idx" ON "AutomationScriptExecution"("requestedById");

-- CreateIndex
CREATE INDEX "AutomationScriptExecution_status_idx" ON "AutomationScriptExecution"("status");

-- CreateIndex
CREATE INDEX "AutomationScriptExecution_framework_idx" ON "AutomationScriptExecution"("framework");

-- AddForeignKey
ALTER TABLE "AutomationScriptExecution" ADD CONSTRAINT "AutomationScriptExecution_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "AutomationScript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationScriptExecution" ADD CONSTRAINT "AutomationScriptExecution_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
