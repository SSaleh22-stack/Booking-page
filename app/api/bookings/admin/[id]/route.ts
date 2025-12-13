import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendBookingUpdateEmail, sendBookingCancellationEmail } from '@/lib/email'

// Admin endpoint for canceling or rescheduling bookings by ID

// DELETE /api/bookings/admin/:id - Cancel a booking
export async function DELETE(
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
        { error: 'الحجز غير موجود' },
        { status: 404 }
      )
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'الحجز ملغي بالفعل' },
        { status: 400 }
      )
    }

    // Update booking status to CANCELLED
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    })

    // Send cancellation email
    try {
      const selectedRows = JSON.parse(booking.selectedRows) as number[]
      await sendBookingCancellationEmail({
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
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError)
    }

    return NextResponse.json({ message: 'تم إلغاء الحجز بنجاح' })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'فشل إلغاء الحجز' },
      { status: 500 }
    )
  }
}

// PATCH /api/bookings/admin/:id - Reschedule a booking
const rescheduleSchema = z.object({
  examSlotId: z.string().optional(),
  bookingStartTime: z.string().optional(),
  bookingDurationMinutes: z.number().int().optional(),
  selectedRows: z.array(z.number().int()).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = rescheduleSchema.parse(body)

    // Find the booking
    const existingBooking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        examSlot: true,
      },
    })

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'الحجز غير موجود' },
        { status: 404 }
      )
    }

    if (existingBooking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'لا يمكن إعادة جدولة حجز ملغي' },
        { status: 400 }
      )
    }

    // Determine which exam slot to use
    const examSlotId = validated.examSlotId || existingBooking.examSlotId
    const examSlot = await prisma.examSlot.findUnique({
      where: { id: examSlotId },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
            id: { not: existingBooking.id }, // Exclude current booking
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

    // Validate booking start time and duration for time window system
    const bookingStartTime = validated.bookingStartTime || existingBooking.bookingStartTime || examSlot.startTime
    const bookingDurationMinutes = validated.bookingDurationMinutes || existingBooking.bookingDurationMinutes || examSlot.durationMinutes || 60

    if (examSlot.endTime && examSlot.allowedDurations) {
      // New time window system
      const [startHours, startMins] = examSlot.startTime.split(':').map(Number)
      const [endHours, endMins] = examSlot.endTime.split(':').map(Number)
      const [bookingStartHours, bookingStartMins] = bookingStartTime.split(':').map(Number)
      
      const windowStartMinutes = startHours * 60 + startMins
      const windowEndMinutes = endHours * 60 + endMins
      const bookingStartMinutes = bookingStartHours * 60 + bookingStartMins
      const bookingEndMinutes = bookingStartMinutes + bookingDurationMinutes

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

      if (allowedDurations.length > 0 && !allowedDurations.includes(bookingDurationMinutes)) {
        return NextResponse.json(
          { error: `المدة ${bookingDurationMinutes} دقيقة غير مسموحة. المدد المسموحة: ${allowedDurations.join(', ')} دقيقة` },
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
            const selectedRows = validated.selectedRows || JSON.parse(existingBooking.selectedRows) as number[]
            try {
              const existingRows = JSON.parse(booking.selectedRows) as number[]
              const rowConflict = selectedRows.some(row => existingRows.includes(row))
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

    // Validate selected rows if provided
    const selectedRows = validated.selectedRows || JSON.parse(existingBooking.selectedRows) as number[]
    
    const invalidRows = selectedRows.filter(
      (row: number) => row < examSlot.rowStart || row > examSlot.rowEnd
    )

    if (invalidRows.length > 0) {
      return NextResponse.json(
        { error: `صفوف غير صحيحة: ${invalidRows.join(', ')}. النطاق الصحيح هو ${examSlot.rowStart}-${examSlot.rowEnd}` },
        { status: 400 }
      )
    }

    // For legacy slots, check row conflicts
    if (!examSlot.endTime || !examSlot.allowedDurations) {
      const bookedRows = new Set<number>()
      examSlot.bookings.forEach((booking) => {
        try {
          const rows = JSON.parse(booking.selectedRows) as number[]
          rows.forEach((row) => bookedRows.add(row))
        } catch (e) {
          // Invalid JSON, skip
        }
      })

      const conflictingRows = selectedRows.filter((row: number) => bookedRows.has(row))
      if (conflictingRows.length > 0) {
        return NextResponse.json(
          { error: `الصفوف ${conflictingRows.join(', ')} محجوزة بالفعل` },
          { status: 400 }
        )
      }
    }

    // Update the booking
    const updateData: any = {}
    if (validated.examSlotId) updateData.examSlotId = validated.examSlotId
    if (validated.bookingStartTime) updateData.bookingStartTime = validated.bookingStartTime
    if (validated.bookingDurationMinutes) updateData.bookingDurationMinutes = validated.bookingDurationMinutes
    if (validated.selectedRows) updateData.selectedRows = JSON.stringify(validated.selectedRows)

    const updatedBooking = await prisma.booking.update({
      where: { id: existingBooking.id },
      data: updateData,
      include: {
        examSlot: true,
      },
    })

    // Get the updated slot if it changed
    const updatedSlot = updatedBooking.examSlotId !== existingBooking.examSlotId
      ? await prisma.examSlot.findUnique({ where: { id: updatedBooking.examSlotId } })
      : updatedBooking.examSlot

    // Send update email
    try {
      await sendBookingUpdateEmail({
        bookingId: updatedBooking.id,
        bookingReference: updatedBooking.bookingReference || updatedBooking.id,
        firstName: updatedBooking.firstName,
        lastName: updatedBooking.lastName,
        email: updatedBooking.email,
        date: updatedSlot!.date.toISOString().split('T')[0],
        startTime: bookingStartTime,
        durationMinutes: bookingDurationMinutes,
        locationName: updatedSlot!.locationName,
        selectedRows,
        manageToken: updatedBooking.manageToken,
      })
    } catch (emailError) {
      console.error('Failed to send update email:', emailError)
    }

    return NextResponse.json({
      booking: {
        ...updatedBooking,
        selectedRows: JSON.parse(updatedBooking.selectedRows),
        date: updatedSlot!.date.toISOString().split('T')[0],
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'خطأ في التحقق', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error rescheduling booking:', error)
    return NextResponse.json(
      { error: 'فشل إعادة جدولة الحجز' },
      { status: 500 }
    )
  }
}



