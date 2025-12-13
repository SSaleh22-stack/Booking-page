import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bookingSchema } from '@/lib/validations'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendBookingConfirmationEmail } from '@/lib/email'

// POST /api/bookings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = bookingSchema.parse(body)

    // Verify the exam slot exists and is active
    const examSlot = await prisma.examSlot.findUnique({
      where: { id: validated.examSlotId },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
          },
        },
      },
    })

    if (!examSlot) {
      return NextResponse.json(
        { error: 'فترة الامتحان غير موجودة' },
        { status: 404 }
      )
    }

    if (!examSlot.isActive) {
      return NextResponse.json(
        { error: 'فترة الامتحان غير نشطة' },
        { status: 400 }
      )
    }

    // Validate booking start time and duration for new time window system
    if (examSlot.endTime && examSlot.allowedDurations) {
      // New time window system
      const [startHours, startMins] = examSlot.startTime.split(':').map(Number)
      const [endHours, endMins] = examSlot.endTime.split(':').map(Number)
      const [bookingStartHours, bookingStartMins] = validated.bookingStartTime.split(':').map(Number)
      
      const windowStartMinutes = startHours * 60 + startMins
      const windowEndMinutes = endHours * 60 + endMins
      const bookingStartMinutes = bookingStartHours * 60 + bookingStartMins
      const bookingEndMinutes = bookingStartMinutes + validated.bookingDurationMinutes

      // Check if booking start time is within the window
      if (bookingStartMinutes < windowStartMinutes || bookingStartMinutes >= windowEndMinutes) {
        return NextResponse.json(
          { error: `يجب أن يكون وقت بدء الحجز ضمن النافذة الزمنية (${examSlot.startTime} - ${examSlot.endTime})` },
          { status: 400 }
        )
      }

      // Check if booking end time is within the window
      if (bookingEndMinutes > windowEndMinutes) {
        return NextResponse.json(
          { error: `مدة الحجز ستتجاوز وقت انتهاء النافذة الزمنية (${examSlot.endTime})` },
          { status: 400 }
        )
      }

      // Check if duration is allowed
      let allowedDurations: number[]
      try {
        allowedDurations = typeof examSlot.allowedDurations === 'string' 
          ? JSON.parse(examSlot.allowedDurations) 
          : examSlot.allowedDurations
      } catch {
        allowedDurations = []
      }

      if (!allowedDurations.includes(validated.bookingDurationMinutes)) {
        return NextResponse.json(
          { error: `المدة ${validated.bookingDurationMinutes} دقيقة غير مسموحة. المدد المسموحة: ${allowedDurations.join(', ')} دقيقة` },
          { status: 400 }
        )
      }

      // Check for time conflicts with existing bookings
      for (const booking of examSlot.bookings) {
        if (booking.bookingStartTime && booking.bookingDurationMinutes) {
          const [existingStartHours, existingStartMins] = booking.bookingStartTime.split(':').map(Number)
          const existingStartMinutes = existingStartHours * 60 + existingStartMins
          const existingEndMinutes = existingStartMinutes + booking.bookingDurationMinutes

          // Check if times overlap
          if (!(bookingEndMinutes <= existingStartMinutes || bookingStartMinutes >= existingEndMinutes)) {
            // Times overlap - check if rows also overlap
            try {
              const existingRows = JSON.parse(booking.selectedRows) as number[]
              const rowConflict = validated.selectedRows.some(row => existingRows.includes(row))
              if (rowConflict) {
                return NextResponse.json(
                  { error: 'هذه الفترة الزمنية ومجموعة الصفوف محجوزة بالفعل' },
                  { status: 400 }
                )
              }
            } catch (e) {
              // Invalid JSON, skip
            }
          }
        }
      }
    }

    // Check if selected rows are within the valid range
    const allSelectedRows = validated.selectedRows
    const invalidRows = allSelectedRows.filter(
      (row) => row < examSlot.rowStart || row > examSlot.rowEnd
    )

    if (invalidRows.length > 0) {
      return NextResponse.json(
        { error: `صفوف غير صحيحة: ${invalidRows.join(', ')}. النطاق الصحيح هو ${examSlot.rowStart}-${examSlot.rowEnd}` },
        { status: 400 }
      )
    }

    // For legacy slots (no time window), check row conflicts without time consideration
    // For time window slots, time-based conflict checking is already done above
    if (!examSlot.endTime || !examSlot.allowedDurations) {
      // Legacy slot - check for row conflicts (any row conflict is a conflict since there's no time window)
      const bookedRows = new Set<number>()
      examSlot.bookings.forEach((booking) => {
        try {
          const rows = JSON.parse(booking.selectedRows) as number[]
          rows.forEach((row) => bookedRows.add(row))
        } catch (e) {
          // Invalid JSON, skip
        }
      })

      const conflictingRows = allSelectedRows.filter((row) => bookedRows.has(row))
      if (conflictingRows.length > 0) {
        return NextResponse.json(
          { error: `الصفوف ${conflictingRows.join(', ')} محجوزة بالفعل` },
          { status: 400 }
        )
      }
    }

    // Generate a secure manage token
    const manageToken = randomBytes(32).toString('hex')

    // Generate 12-character booking reference (alphanumeric)
    const generateBookingReference = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }

    // Ensure unique booking reference
    let bookingReference = generateBookingReference()
    let isUnique = false
    let attempts = 0
    while (!isUnique && attempts < 10) {
      const existing = await prisma.booking.findFirst({
        where: { bookingReference },
      })
      if (!existing) {
        isUnique = true
      } else {
        bookingReference = generateBookingReference()
        attempts++
      }
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        examSlotId: validated.examSlotId,
        bookingReference,
        bookingStartTime: validated.bookingStartTime,
        bookingDurationMinutes: validated.bookingDurationMinutes,
        selectedRows: JSON.stringify(validated.selectedRows),
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone,
        status: 'CONFIRMED',
        manageToken,
      },
      include: {
        examSlot: true,
      },
    })

    // Send confirmation email (don't block on email failure)
    try {
      await sendBookingConfirmationEmail({
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        date: booking.examSlot.date.toISOString().split('T')[0],
        startTime: booking.bookingStartTime || booking.examSlot.startTime,
        durationMinutes: booking.bookingDurationMinutes || booking.examSlot.durationMinutes || 60,
        locationName: booking.examSlot.locationName,
        selectedRows: validated.selectedRows,
        manageToken: booking.manageToken,
      })
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Continue even if email fails
    }

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'خطأ في التحقق', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'فشل إنشاء الحجز' },
      { status: 500 }
    )
  }
}

