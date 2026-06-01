-- CreateTable
CREATE TABLE "JiraConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cloudId" TEXT NOT NULL,
    "siteName" TEXT,
    "siteUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JiraConnection_userId_idx" ON "JiraConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JiraConnection_userId_cloudId_key" ON "JiraConnection"("userId", "cloudId");

-- AddForeignKey
ALTER TABLE "JiraConnection" ADD CONSTRAINT "JiraConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
