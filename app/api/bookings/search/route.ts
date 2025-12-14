import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/bookings/search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingReference, email } = body

    if (!bookingReference || !email) {
      return NextResponse.json(
        { error: 'مرجع الحجز والبريد الإلكتروني مطلوبان' },
        { status: 400 }
      )
    }

    // Search for booking by reference and email
    const booking = await prisma.booking.findFirst({
      where: {
        bookingReference: bookingReference.toUpperCase().trim(),
        email: email.trim().toLowerCase(),
      },
      include: {
        examSlot: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'لم يتم العثور على الحجز. يرجى التحقق من مرجع الحجز والبريد الإلكتروني.' },
        { status: 404 }
      )
    }

    // Format booking for response (handle null examSlot)
    const formattedBooking = {
      ...booking,
      date: booking.examSlot 
        ? booking.examSlot.date.toISOString().split('T')[0]
        : booking.preservedSlotDate?.toISOString().split('T')[0] || null,
      startTime: booking.bookingStartTime || booking.examSlot?.startTime || null,
      durationMinutes: booking.bookingDurationMinutes || booking.examSlot?.durationMinutes || 60,
      locationName: booking.examSlot?.locationName || booking.preservedLocationName || 'غير متاح',
    }

    return NextResponse.json({ booking: formattedBooking })
  } catch (error) {
    console.error('Error searching booking:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء البحث عن الحجز' },
      { status: 500 }
    )
  }
}

