-- CreateEnum
CREATE TYPE "MikrotikSuspensionType" AS ENUM ('PPPOE', 'QUEUE', 'ADDRESS_LIST');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "mikrotikProfileId" TEXT,
ADD COLUMN     "pppoePassword" TEXT;

-- CreateTable
CREATE TABLE "MikrotikProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 8728,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "suspensionType" "MikrotikSuspensionType" NOT NULL DEFAULT 'PPPOE',
    "pppoeService" TEXT,
    "addressListName" TEXT DEFAULT 'suspended',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MikrotikProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MikrotikCommandLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "customerId" TEXT,
    "command" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MikrotikCommandLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MikrotikProfile_name_key" ON "MikrotikProfile"("name");

-- CreateIndex
CREATE INDEX "MikrotikCommandLog_command_status_idx" ON "MikrotikCommandLog"("command", "status");

-- CreateIndex
CREATE INDEX "MikrotikCommandLog_createdAt_idx" ON "MikrotikCommandLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_mikrotikProfileId_fkey" FOREIGN KEY ("mikrotikProfileId") REFERENCES "MikrotikProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MikrotikCommandLog" ADD CONSTRAINT "MikrotikCommandLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MikrotikProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
