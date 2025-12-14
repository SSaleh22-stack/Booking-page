import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper function to normalize booking reference
function normalizeBookingReference(ref: string | null | undefined): string {
  if (!ref) return ''
  return ref.trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '')
}

// Helper function to normalize email
function normalizeEmail(email: string | null | undefined): string {
  if (!email) return ''
  return email.trim().toLowerCase().replace(/\s+/g, '')
}

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

    // Normalize inputs
    const normalizedReference = normalizeBookingReference(bookingReference)
    const normalizedEmail = normalizeEmail(email)

    console.log('=== SEARCH REQUEST ===')
    console.log('Original Reference:', bookingReference)
    console.log('Normalized Reference:', normalizedReference)
    console.log('Original Email:', email)
    console.log('Normalized Email:', normalizedEmail)

    if (!normalizedReference || !normalizedEmail) {
      return NextResponse.json(
        { error: 'مرجع الحجز والبريد الإلكتروني غير صالحين' },
        { status: 400 }
      )
    }

    // Strategy 1: Search by normalized email first (exact match)
    let bookingsByEmail = await prisma.booking.findMany({
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

    console.log(`Found ${bookingsByEmail.length} bookings for email (exact match)`)

    // Strategy 1b: If no exact match, try case-insensitive email search
    if (bookingsByEmail.length === 0) {
      bookingsByEmail = await prisma.booking.findMany({
        where: {
          email: {
            contains: normalizedEmail,
            mode: 'insensitive',
          },
        },
        include: {
          examSlot: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      console.log(`Found ${bookingsByEmail.length} bookings for email (case-insensitive)`)
    }

    // Strategy 2: Filter by booking reference in memory (most reliable)
    let booking = bookingsByEmail.find(b => {
      if (!b.bookingReference) {
        console.log(`Booking ${b.id} has no bookingReference`)
        return false
      }
      const storedRef = normalizeBookingReference(b.bookingReference)
      const match = storedRef === normalizedReference
      console.log(`Comparing: "${storedRef}" === "${normalizedReference}" = ${match}`)
      return match
    })

    // Strategy 3: If not found, try direct Prisma query with exact match
    if (!booking) {
      console.log('Trying direct Prisma query (exact match)...')
      const directBooking = await prisma.booking.findFirst({
        where: {
          bookingReference: normalizedReference,
          email: normalizedEmail,
        },
        include: {
          examSlot: true,
        },
      })
      
      if (directBooking) {
        console.log('Found booking via direct query (exact match)')
        booking = directBooking
      }
    }

    // Strategy 4: Try with original values (non-normalized)
    if (!booking) {
      console.log('Trying with original values...')
      const originalBooking = await prisma.booking.findFirst({
        where: {
          OR: [
            { 
              bookingReference: bookingReference.trim(),
              email: email.trim(),
            },
            { 
              bookingReference: bookingReference.trim().toUpperCase(),
              email: email.trim().toLowerCase(),
            },
            { 
              bookingReference: bookingReference.trim().toLowerCase(),
              email: email.trim().toUpperCase(),
            },
          ],
        },
        include: {
          examSlot: true,
        },
      })
      
      if (originalBooking) {
        console.log('Found booking via original values')
        booking = originalBooking
      }
    }

    // Strategy 5: Try case-insensitive email with exact reference
    if (!booking) {
      console.log('Trying case-insensitive email with exact reference...')
      const caseInsensitiveBooking = await prisma.booking.findFirst({
        where: {
          bookingReference: normalizedReference,
          email: {
            contains: normalizedEmail,
            mode: 'insensitive',
          },
        },
        include: {
          examSlot: true,
        },
      })
      
      if (caseInsensitiveBooking) {
        console.log('Found booking via case-insensitive email')
        booking = caseInsensitiveBooking
      }
    }

    // Strategy 6: Try partial reference match (if reference is at least 6 characters)
    if (!booking && normalizedReference.length >= 6) {
      console.log('Trying partial reference match...')
      const partialBooking = bookingsByEmail.find(b => {
        if (!b.bookingReference) return false
        const storedRef = normalizeBookingReference(b.bookingReference)
        return storedRef.startsWith(normalizedReference) || normalizedReference.startsWith(storedRef)
      })
      
      if (partialBooking) {
        console.log('Found booking via partial match')
        booking = partialBooking
      }
    }

    // Log all bookings found for debugging
    if (bookingsByEmail.length > 0 && !booking) {
      console.log('All bookings found for this email:')
      bookingsByEmail.forEach(b => {
        console.log(`  - ID: ${b.id}, Reference: "${b.bookingReference}", Email: "${b.email}"`)
      })
    }

    if (!booking) {
      const errorMessage = bookingsByEmail.length > 0
        ? `لم يتم العثور على حجز بمرجع "${bookingReference}" للبريد الإلكتروني "${email}". تم العثور على ${bookingsByEmail.length} حجز(حجوزات) أخرى لهذا البريد.`
        : `لم يتم العثور على حجز بالبريد الإلكتروني "${email}". يرجى التحقق من مرجع الحجز والبريد الإلكتروني.`
      
      console.log('=== SEARCH FAILED ===')
      console.log('Error:', errorMessage)
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }

    console.log('=== SEARCH SUCCESS ===')
    console.log('Found booking:', {
      id: booking.id,
      bookingReference: booking.bookingReference,
      email: booking.email,
      status: booking.status,
    })

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
    console.error('=== SEARCH ERROR ===')
    console.error('Error searching booking:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء البحث عن الحجز' },
      { status: 500 }
    )
  }
}
