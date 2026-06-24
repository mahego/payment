-- CreateEnum
CREATE TYPE "NetworkConnectionType" AS ENUM ('VPN', 'PUBLIC_IP', 'LAN', 'MANUAL');

-- CreateEnum
CREATE TYPE "NetworkRouterStatus" AS ENUM ('PENDING', 'ONLINE', 'OFFLINE', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "NetworkServiceMode" AS ENUM ('PPPOE', 'SIMPLE_QUEUE', 'HOTSPOT', 'ADDRESS_LIST');

-- CreateEnum
CREATE TYPE "NetworkActionType" AS ENUM ('TEST_CONNECTION', 'SUSPEND_CUSTOMER', 'REACTIVATE_CUSTOMER', 'DISABLE_PPPOE', 'ENABLE_PPPOE', 'DISABLE_QUEUE', 'ENABLE_QUEUE', 'DISABLE_HOTSPOT', 'ENABLE_HOTSPOT', 'ADD_ADDRESS_LIST', 'REMOVE_ADDRESS_LIST');

-- CreateEnum
CREATE TYPE "NetworkActionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYING');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "hotspotUsername" TEXT,
ADD COLUMN     "isNetworkSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastReactivatedAt" TIMESTAMP(3),
ADD COLUMN     "lastSuspendedAt" TIMESTAMP(3),
ADD COLUMN     "macAddress" TEXT,
ADD COLUMN     "serviceMode" "NetworkServiceMode" NOT NULL DEFAULT 'PPPOE',
ADD COLUMN     "simpleQueueName" TEXT,
ADD COLUMN     "suspensionAddressList" TEXT DEFAULT 'suspended';

-- AlterTable
ALTER TABLE "MikrotikProfile" ADD COLUMN     "connectionType" "NetworkConnectionType" NOT NULL DEFAULT 'VPN',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastConnectionTestAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "status" "NetworkRouterStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "zoneName" TEXT;

-- CreateTable
CREATE TABLE "NetworkAction" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "customerId" TEXT,
    "actionType" "NetworkActionType" NOT NULL,
    "status" "NetworkActionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetworkAction_status_createdAt_idx" ON "NetworkAction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NetworkAction_profileId_status_idx" ON "NetworkAction"("profileId", "status");

-- CreateIndex
CREATE INDEX "NetworkAction_customerId_idx" ON "NetworkAction"("customerId");

-- AddForeignKey
ALTER TABLE "NetworkAction" ADD CONSTRAINT "NetworkAction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MikrotikProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkAction" ADD CONSTRAINT "NetworkAction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
