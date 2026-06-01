-- CreateEnum
CREATE TYPE "DefectReportStatus" AS ENUM ('OPEN', 'TRIAGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DefectSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TestSuiteReportStatus" AS ENUM ('PASSED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "DefectReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" "DefectSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "DefectReportStatus" NOT NULL DEFAULT 'OPEN',
    "failureReason" TEXT,
    "reproductionSteps" JSONB,
    "environment" TEXT,
    "browser" "BrowserTarget",
    "targetUrl" TEXT,
    "command" TEXT,
    "exitCode" INTEGER,
    "stdoutExcerpt" TEXT,
    "stderrExcerpt" TEXT,
    "logs" JSONB,
    "artifacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefectReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuiteReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT,
    "scriptId" TEXT,
    "requestedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TestSuiteReportStatus" NOT NULL,
    "total" INTEGER NOT NULL,
    "passed" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "timedOut" INTEGER NOT NULL,
    "canceled" INTEGER NOT NULL,
    "running" INTEGER NOT NULL,
    "queued" INTEGER NOT NULL,
    "passRate" DOUBLE PRECISION NOT NULL,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "summary" JSONB,
    "artifacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSuiteReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuiteReportItem" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "status" "AutomationScriptExecutionStatus" NOT NULL,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestSuiteReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DefectReport_executionId_key" ON "DefectReport"("executionId");

-- CreateIndex
CREATE INDEX "DefectReport_projectId_idx" ON "DefectReport"("projectId");

-- CreateIndex
CREATE INDEX "DefectReport_workItemId_idx" ON "DefectReport"("workItemId");

-- CreateIndex
CREATE INDEX "DefectReport_testCaseId_idx" ON "DefectReport"("testCaseId");

-- CreateIndex
CREATE INDEX "DefectReport_scriptId_idx" ON "DefectReport"("scriptId");

-- CreateIndex
CREATE INDEX "DefectReport_createdById_idx" ON "DefectReport"("createdById");

-- CreateIndex
CREATE INDEX "DefectReport_status_idx" ON "DefectReport"("status");

-- CreateIndex
CREATE INDEX "DefectReport_severity_idx" ON "DefectReport"("severity");

-- CreateIndex
CREATE INDEX "TestSuiteReport_projectId_idx" ON "TestSuiteReport"("projectId");

-- CreateIndex
CREATE INDEX "TestSuiteReport_workItemId_idx" ON "TestSuiteReport"("workItemId");

-- CreateIndex
CREATE INDEX "TestSuiteReport_scriptId_idx" ON "TestSuiteReport"("scriptId");

-- CreateIndex
CREATE INDEX "TestSuiteReport_requestedById_idx" ON "TestSuiteReport"("requestedById");

-- CreateIndex
CREATE INDEX "TestSuiteReport_status_idx" ON "TestSuiteReport"("status");

-- CreateIndex
CREATE INDEX "TestSuiteReportItem_reportId_idx" ON "TestSuiteReportItem"("reportId");

-- CreateIndex
CREATE INDEX "TestSuiteReportItem_executionId_idx" ON "TestSuiteReportItem"("executionId");

-- CreateIndex
CREATE INDEX "TestSuiteReportItem_scriptId_idx" ON "TestSuiteReportItem"("scriptId");

-- CreateIndex
CREATE INDEX "TestSuiteReportItem_testCaseId_idx" ON "TestSuiteReportItem"("testCaseId");

-- CreateIndex
CREATE INDEX "TestSuiteReportItem_workItemId_idx" ON "TestSuiteReportItem"("workItemId");

-- CreateIndex
CREATE INDEX "TestSuiteReportItem_status_idx" ON "TestSuiteReportItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TestSuiteReportItem_reportId_executionId_key" ON "TestSuiteReportItem"("reportId", "executionId");

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "AutomationScript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AutomationScriptExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteReport" ADD CONSTRAINT "TestSuiteReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteReport" ADD CONSTRAINT "TestSuiteReport_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteReport" ADD CONSTRAINT "TestSuiteReport_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "AutomationScript"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteReport" ADD CONSTRAINT "TestSuiteReport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteReportItem" ADD CONSTRAINT "TestSuiteReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TestSuiteReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteReportItem" ADD CONSTRAINT "TestSuiteReportItem_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AutomationScriptExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
