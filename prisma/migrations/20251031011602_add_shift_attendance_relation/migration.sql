/*
  Warnings:

  - You are about to drop the column `ts` on the `AttendanceEvent` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `AttendanceEvent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,employeeId,date]` on the table `AttendanceEvent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `AttendanceEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AttendanceEvent` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `Employee` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('working', 'present', 'late', 'left_early', 'absent');

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_userId_fkey";

-- AlterTable
ALTER TABLE "AttendanceEvent" DROP COLUMN "ts",
DROP COLUMN "type",
ADD COLUMN     "clockInAt" TIMESTAMP(3),
ADD COLUMN     "clockInLat" DOUBLE PRECISION,
ADD COLUMN     "clockInLng" DOUBLE PRECISION,
ADD COLUMN     "clockInSrc" TEXT,
ADD COLUMN     "clockOutAt" TIMESTAMP(3),
ADD COLUMN     "clockOutLat" DOUBLE PRECISION,
ADD COLUMN     "clockOutLng" DOUBLE PRECISION,
ADD COLUMN     "clockOutSrc" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "minutes" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "shiftId" TEXT,
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'working',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AttendanceEvent_tenantId_date_idx" ON "AttendanceEvent"("tenantId", "date");

-- CreateIndex
CREATE INDEX "AttendanceEvent_employeeId_date_idx" ON "AttendanceEvent"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEvent_tenantId_employeeId_date_key" ON "AttendanceEvent"("tenantId", "employeeId", "date");

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
