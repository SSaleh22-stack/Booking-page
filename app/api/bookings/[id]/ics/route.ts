import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createEvent } from 'ics'

// GET /api/bookings/:id/ics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        examSlot: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot generate calendar for cancelled booking' },
        { status: 400 }
      )
    }

    // Parse date and time
    const slotDate = new Date(booking.examSlot.date)
    const startTime = booking.bookingStartTime || booking.examSlot.startTime
    const [hours, minutes] = startTime.split(':').map(Number)
    
    // Create start date in local time (Asia/Riyadh)
    // We treat the date/time as if it's already in Asia/Riyadh timezone
    const startDate = new Date(slotDate)
    startDate.setHours(hours, minutes, 0, 0)
    
    // Calculate end time - use booking duration if available, otherwise slot duration, fallback to 60
    const durationMinutes = booking.bookingDurationMinutes || booking.examSlot.durationMinutes || 60
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)

    const selectedRows = JSON.parse(booking.selectedRows) as number[]
    const rowsText = selectedRows.sort((a, b) => a - b).join(', ')

    const event = {
      start: [
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        startDate.getDate(),
        startDate.getHours(),
        startDate.getMinutes(),
      ] as [number, number, number, number, number],
      end: [
        endDate.getFullYear(),
        endDate.getMonth() + 1,
        endDate.getDate(),
        endDate.getHours(),
        endDate.getMinutes(),
      ] as [number, number, number, number, number],
      title: `Exam Room Booking - ${booking.examSlot.locationName}`,
      description: `Exam Room Booking\n\nLocation: ${booking.examSlot.locationName}\nRows: ${rowsText}\nDuration: ${durationMinutes} minutes\n\nBooking ID: ${booking.id}`,
      location: booking.examSlot.locationName,
      startInputType: 'local' as const,
      startOutputType: 'local' as const,
      productId: 'exam-room-booking/ics',
    }

    const { error, value } = createEvent(event)

    if (error) {
      console.error('Error creating ICS event:', error)
      return NextResponse.json(
        { error: 'Failed to generate calendar file' },
        { status: 500 }
      )
    }

    return new NextResponse(value, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="exam-booking-${booking.id}.ics"`,
      },
    })
  } catch (error) {
    console.error('Error generating ICS file:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar file' },
      { status: 500 }
    )
  }
}

