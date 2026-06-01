-- CreateEnum
CREATE TYPE "TestCaseGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TestCaseStatus" AS ENUM ('GENERATED', 'EDITED', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TestCaseType" AS ENUM ('FUNCTIONAL', 'VALIDATION', 'NEGATIVE', 'EDGE_CASE', 'SECURITY', 'UI', 'INTEGRATION', 'REGRESSION');

-- CreateEnum
CREATE TYPE "TestCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "TestCaseGeneration" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "TestCaseGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "generationMethod" TEXT,
    "inputHash" TEXT NOT NULL,
    "options" JSONB,
    "warnings" JSONB,
    "errorMessage" TEXT,
    "aiTrace" JSONB,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCaseGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "generationId" TEXT,
    "generatedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "type" "TestCaseType" NOT NULL,
    "priority" "TestCasePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TestCaseStatus" NOT NULL DEFAULT 'GENERATED',
    "preconditions" JSONB,
    "steps" JSONB NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "testData" JSONB,
    "tags" JSONB,
    "coverage" JSONB,
    "aiTrace" JSONB,
    "reviewNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestCaseGeneration_workItemId_idx" ON "TestCaseGeneration"("workItemId");

-- CreateIndex
CREATE INDEX "TestCaseGeneration_requestedById_idx" ON "TestCaseGeneration"("requestedById");

-- CreateIndex
CREATE INDEX "TestCaseGeneration_status_idx" ON "TestCaseGeneration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TestCaseGeneration_workItemId_inputHash_key" ON "TestCaseGeneration"("workItemId", "inputHash");

-- CreateIndex
CREATE INDEX "TestCase_workItemId_idx" ON "TestCase"("workItemId");

-- CreateIndex
CREATE INDEX "TestCase_generationId_idx" ON "TestCase"("generationId");

-- CreateIndex
CREATE INDEX "TestCase_generatedById_idx" ON "TestCase"("generatedById");

-- CreateIndex
CREATE INDEX "TestCase_status_idx" ON "TestCase"("status");

-- CreateIndex
CREATE INDEX "TestCase_type_idx" ON "TestCase"("type");

-- AddForeignKey
ALTER TABLE "TestCaseGeneration" ADD CONSTRAINT "TestCaseGeneration_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseGeneration" ADD CONSTRAINT "TestCaseGeneration_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "TestCaseGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
