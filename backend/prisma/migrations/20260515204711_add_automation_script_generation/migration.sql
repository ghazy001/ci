-- CreateEnum
CREATE TYPE "AutomationScriptGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationScriptStatus" AS ENUM ('GENERATED', 'EDITED', 'APPROVED', 'DECLINED', 'REMOVED');

-- CreateEnum
CREATE TYPE "AutomationFramework" AS ENUM ('PLAYWRIGHT_TS', 'PLAYWRIGHT_PYTHON', 'CYPRESS_TS', 'SELENIUM_JAVA');

-- CreateEnum
CREATE TYPE "BrowserTarget" AS ENUM ('CHROMIUM', 'FIREFOX', 'WEBKIT', 'CHROME', 'EDGE');

-- CreateTable
CREATE TABLE "AutomationScriptGeneration" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "AutomationScriptGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "framework" "AutomationFramework" NOT NULL,
    "browser" "BrowserTarget",
    "targetUrl" TEXT NOT NULL,
    "environment" TEXT,
    "context" JSONB,
    "pageInspection" JSONB,
    "warnings" JSONB,
    "errorMessage" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "generationMethod" TEXT,
    "confidence" DOUBLE PRECISION,
    "aiTrace" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationScriptGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationScript" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "status" "AutomationScriptStatus" NOT NULL DEFAULT 'GENERATED',
    "framework" "AutomationFramework" NOT NULL,
    "fileName" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "explanation" TEXT,
    "dependencies" JSONB,
    "setupNotes" JSONB,
    "selectorsUsed" JSONB,
    "warnings" JSONB,
    "aiTrace" JSONB,
    "reviewNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationScript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationScriptGeneration_testCaseId_idx" ON "AutomationScriptGeneration"("testCaseId");

-- CreateIndex
CREATE INDEX "AutomationScriptGeneration_workItemId_idx" ON "AutomationScriptGeneration"("workItemId");

-- CreateIndex
CREATE INDEX "AutomationScriptGeneration_requestedById_idx" ON "AutomationScriptGeneration"("requestedById");

-- CreateIndex
CREATE INDEX "AutomationScriptGeneration_status_idx" ON "AutomationScriptGeneration"("status");

-- CreateIndex
CREATE INDEX "AutomationScriptGeneration_framework_idx" ON "AutomationScriptGeneration"("framework");

-- CreateIndex
CREATE INDEX "AutomationScript_generationId_idx" ON "AutomationScript"("generationId");

-- CreateIndex
CREATE INDEX "AutomationScript_testCaseId_idx" ON "AutomationScript"("testCaseId");

-- CreateIndex
CREATE INDEX "AutomationScript_workItemId_idx" ON "AutomationScript"("workItemId");

-- CreateIndex
CREATE INDEX "AutomationScript_generatedById_idx" ON "AutomationScript"("generatedById");

-- CreateIndex
CREATE INDEX "AutomationScript_status_idx" ON "AutomationScript"("status");

-- CreateIndex
CREATE INDEX "AutomationScript_framework_idx" ON "AutomationScript"("framework");

-- AddForeignKey
ALTER TABLE "AutomationScriptGeneration" ADD CONSTRAINT "AutomationScriptGeneration_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationScriptGeneration" ADD CONSTRAINT "AutomationScriptGeneration_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationScriptGeneration" ADD CONSTRAINT "AutomationScriptGeneration_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationScript" ADD CONSTRAINT "AutomationScript_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "AutomationScriptGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationScript" ADD CONSTRAINT "AutomationScript_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationScript" ADD CONSTRAINT "AutomationScript_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationScript" ADD CONSTRAINT "AutomationScript_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
