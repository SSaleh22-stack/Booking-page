-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "bookingReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "Booking"("bookingReference");

-- CreateIndex
CREATE INDEX "Booking_bookingReference_idx" ON "Booking"("bookingReference");




