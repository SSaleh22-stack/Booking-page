import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendBookingCancellationEmail } from '@/lib/email'

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()),
  sendEmail: z.boolean().default(false),
})

// POST /api/bookings/admin/bulk-delete - Permanently delete bookings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = bulkDeleteSchema.parse(body)

    if (validated.ids.length === 0) {
      return NextResponse.json(
        { error: 'لم يتم تحديد حجوزات للحذف' },
        { status: 400 }
      )
    }

    // Fetch bookings with exam slot info before deletion
    const bookings = await prisma.booking.findMany({
      where: {
        id: {
          in: validated.ids,
        },
      },
      include: {
        examSlot: true,
      },
    })

    if (bookings.length === 0) {
      return NextResponse.json(
        { error: 'لم يتم العثور على الحجوزات المحددة' },
        { status: 404 }
      )
    }

    // Send cancellation emails if requested
    let emailsSent = 0
    let emailsFailed = 0

    if (validated.sendEmail) {
      for (const booking of bookings) {
        try {
          // Only send email if booking has exam slot info (or preserved info)
          if (booking.examSlot || (booking.preservedSlotDate && booking.preservedLocationName)) {
            const selectedRows = JSON.parse(booking.selectedRows) as number[]
            
            // Get date and location from exam slot or preserved info
            let bookingDate: string
            let locationName: string
            let startTime: string
            let durationMinutes: number

            if (booking.examSlot) {
              bookingDate = booking.examSlot.date.toISOString().split('T')[0]
              locationName = booking.examSlot.locationName
              startTime = booking.bookingStartTime || booking.examSlot.startTime
              durationMinutes = booking.bookingDurationMinutes || booking.examSlot.durationMinutes || 60
            } else {
              // Use preserved info
              bookingDate = booking.preservedSlotDate!.toISOString().split('T')[0]
              locationName = booking.preservedLocationName!
              startTime = booking.bookingStartTime || '09:00'
              durationMinutes = booking.bookingDurationMinutes || 60
            }

            await sendBookingCancellationEmail({
              bookingId: booking.id,
              bookingReference: booking.bookingReference || booking.id,
              firstName: booking.firstName,
              lastName: booking.lastName,
              email: booking.email,
              date: bookingDate,
              startTime,
              durationMinutes,
              locationName,
              selectedRows,
              manageToken: booking.manageToken,
            })
            emailsSent++
          }
        } catch (emailError) {
          console.error(`Failed to send cancellation email for booking ${booking.id}:`, emailError)
          emailsFailed++
        }
      }
    }

    // Permanently delete bookings
    await prisma.booking.deleteMany({
      where: {
        id: {
          in: validated.ids,
        },
      },
    })

    return NextResponse.json({
      message: `تم حذف ${bookings.length} حجز بشكل دائم`,
      deletedCount: bookings.length,
      emailsSent: validated.sendEmail ? emailsSent : 0,
      emailsFailed: validated.sendEmail ? emailsFailed : 0,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'خطأ في التحقق', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error deleting bookings:', error)
    return NextResponse.json(
      { error: 'فشل حذف الحجوزات' },
      { status: 500 }
    )
  }
}




