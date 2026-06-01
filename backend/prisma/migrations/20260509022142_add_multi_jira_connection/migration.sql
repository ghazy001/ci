/*
  Warnings:

  - A unique constraint covering the columns `[projectId,externalSystem,externalCloudId,externalRef]` on the table `WorkItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "WorkItem_projectId_externalSystem_externalRef_key";

-- AlterTable
ALTER TABLE "WorkItem" ADD COLUMN     "externalCloudId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkItem_projectId_externalSystem_externalCloudId_externalR_key" ON "WorkItem"("projectId", "externalSystem", "externalCloudId", "externalRef");
