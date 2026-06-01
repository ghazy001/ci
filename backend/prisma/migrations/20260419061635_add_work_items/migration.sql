-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('FEATURE', 'BUG', 'IMPROVEMENT', 'TASK', 'USER_STORY');

-- CreateEnum
CREATE TYPE "WorkItemSource" AS ENUM ('MANUAL', 'JIRA');

-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('DRAFT', 'READY_FOR_AI', 'PROCESSING', 'ANALYZED', 'FAILED');

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "WorkItemType" NOT NULL,
    "source" "WorkItemSource" NOT NULL,
    "status" "WorkItemStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "acceptanceCriteria" JSONB,
    "businessRules" JSONB,
    "priority" TEXT,
    "externalSystem" TEXT,
    "externalRef" TEXT,
    "rawPayload" JSONB,
    "normalizedContent" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkItem_projectId_idx" ON "WorkItem"("projectId");

-- CreateIndex
CREATE INDEX "WorkItem_createdById_idx" ON "WorkItem"("createdById");

-- CreateIndex
CREATE INDEX "WorkItem_source_idx" ON "WorkItem"("source");

-- CreateIndex
CREATE UNIQUE INDEX "WorkItem_projectId_externalSystem_externalRef_key" ON "WorkItem"("projectId", "externalSystem", "externalRef");

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
