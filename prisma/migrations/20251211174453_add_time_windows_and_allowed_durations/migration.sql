/*
  Warnings:

  - Added the required column `bookingDurationMinutes` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingStartTime` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingDurationMinutes" INTEGER NOT NULL,
ADD COLUMN     "bookingStartTime" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExamSlot" ADD COLUMN     "allowedDurations" TEXT,
ADD COLUMN     "endTime" TEXT,
ALTER COLUMN "durationMinutes" DROP NOT NULL;
