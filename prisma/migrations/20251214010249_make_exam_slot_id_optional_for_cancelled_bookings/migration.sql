-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_examSlotId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "examSlotId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_examSlotId_fkey" FOREIGN KEY ("examSlotId") REFERENCES "ExamSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
