import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingReminderEmail } from '@/lib/email'

// POST /api/bookings/send-reminders - Send reminder emails for bookings tomorrow
export async function POST(request: NextRequest) {
  try {
    // Get tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0]

    // Find all confirmed bookings for tomorrow
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        examSlot: {
          date: {
            gte: new Date(tomorrowDateStr + 'T00:00:00.000Z'),
            lt: new Date(tomorrowDateStr + 'T23:59:59.999Z'),
          },
        },
      },
      include: {
        examSlot: true,
      },
    })

    let sentCount = 0
    let errorCount = 0

    // Send reminder emails
    for (const booking of bookings) {
      try {
        // Skip bookings without exam slot
        if (!booking.examSlot) {
          console.warn(`Skipping booking ${booking.id} - no exam slot associated`)
          errorCount++
          continue
        }

        const selectedRows = JSON.parse(booking.selectedRows) as number[]
        await sendBookingReminderEmail({
          bookingId: booking.id,
          bookingReference: booking.bookingReference || booking.id,
          firstName: booking.firstName,
          lastName: booking.lastName,
          email: booking.email,
          date: booking.examSlot.date.toISOString().split('T')[0],
          startTime: booking.bookingStartTime || booking.examSlot.startTime,
          durationMinutes: booking.bookingDurationMinutes || booking.examSlot.durationMinutes || 60,
          locationName: booking.examSlot.locationName,
          selectedRows,
          manageToken: booking.manageToken,
        })
        sentCount++
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      message: 'تم إرسال التذكيرات',
      sent: sentCount,
      errors: errorCount,
      total: bookings.length,
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'فشل إرسال التذكيرات' },
      { status: 500 }
    )
  }
}

// GET /api/bookings/send-reminders - Check how many reminders would be sent
export async function GET() {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0]

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        examSlot: {
          date: {
            gte: new Date(tomorrowDateStr + 'T00:00:00.000Z'),
            lt: new Date(tomorrowDateStr + 'T23:59:59.999Z'),
          },
        },
      },
      include: {
        examSlot: true,
      },
    })

    return NextResponse.json({
      count: bookings.filter(b => b.examSlot !== null).length,
      date: tomorrowDateStr,
      bookings: bookings
        .filter(b => b.examSlot !== null)
        .map(b => ({
          id: b.id,
          bookingReference: b.bookingReference,
          email: b.email,
          date: b.examSlot!.date.toISOString().split('T')[0],
        })),
    })
  } catch (error) {
    console.error('Error checking reminders:', error)
    return NextResponse.json(
      { error: 'فشل التحقق من التذكيرات' },
      { status: 500 }
    )
  }
}

