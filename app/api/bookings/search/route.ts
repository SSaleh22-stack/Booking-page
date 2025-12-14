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

    // Normalize inputs - remove all whitespace and convert to uppercase for reference
    const normalizedReference = bookingReference.trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '')
    const normalizedEmail = email.trim().toLowerCase().replace(/\s+/g, '')

    console.log('Searching for booking:', {
      originalReference: bookingReference,
      normalizedReference,
      originalEmail: email,
      normalizedEmail,
    })

    // First, search by email to get all bookings for this email
    const bookingsByEmail = await prisma.booking.findMany({
      where: {
        email: normalizedEmail,
      },
      include: {
        examSlot: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`Found ${bookingsByEmail.length} bookings for email:`, bookingsByEmail.map(b => ({
      id: b.id,
      bookingReference: b.bookingReference,
      email: b.email,
    })))

    // Now filter by booking reference (handle null references and normalize)
    let booking = bookingsByEmail.find(b => {
      if (!b.bookingReference) return false
      const storedRef = b.bookingReference.trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '')
      return storedRef === normalizedReference
    })

    // If still not found, try exact match with Prisma query as fallback
    if (!booking) {
      const fallbackBooking = await prisma.booking.findFirst({
        where: {
          bookingReference: normalizedReference,
          email: normalizedEmail,
        },
        include: {
          examSlot: true,
        },
      })
      if (fallbackBooking) {
        booking = fallbackBooking
      }
    }

    if (!booking) {
      // Provide more helpful error message
      const errorMessage = bookingsByEmail.length > 0
        ? `لم يتم العثور على حجز بمرجع "${normalizedReference}" للبريد الإلكتروني "${normalizedEmail}". تم العثور على ${bookingsByEmail.length} حجز(حجوزات) أخرى لهذا البريد.`
        : `لم يتم العثور على حجز بالبريد الإلكتروني "${normalizedEmail}". يرجى التحقق من مرجع الحجز والبريد الإلكتروني.`
      
      return NextResponse.json(
        { error: errorMessage },
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

