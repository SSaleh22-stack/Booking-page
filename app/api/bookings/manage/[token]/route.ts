import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateBookingSchema } from '@/lib/validations'
import { z } from 'zod'
import { sendBookingUpdateEmail, sendBookingCancellationEmail } from '@/lib/email'

// GET /api/bookings/manage/:token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { manageToken: params.token },
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

    if (!booking.examSlot) {
      return NextResponse.json(
        { error: 'الحجز لا يحتوي على فترة امتحان مرتبطة' },
        { status: 400 }
      )
    }

    const selectedRows = JSON.parse(booking.selectedRows) as number[]

    return NextResponse.json({
      booking: {
        ...booking,
        selectedRows,
        date: booking.examSlot.date.toISOString().split('T')[0],
      },
      slot: {
        ...booking.examSlot,
        date: booking.examSlot.date.toISOString().split('T')[0],
      },
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'فشل جلب الحجز' },
      { status: 500 }
    )
  }
}

// PATCH /api/bookings/manage/:token
export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json()
    const validated = updateBookingSchema.parse(body)

    // Find the booking
    const existingBooking = await prisma.booking.findUnique({
      where: { manageToken: params.token },
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
        { error: 'لا يمكن تحديث حجز ملغي' },
        { status: 400 }
      )
    }

    // Determine which exam slot to use
    if (!existingBooking.examSlotId) {
      return NextResponse.json(
        { error: 'الحجز لا يحتوي على فترة امتحان مرتبطة' },
        { status: 400 }
      )
    }

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

    // Validate selected rows if provided
    const selectedRows = validated.selectedRows || JSON.parse(existingBooking.selectedRows)
    
    const invalidRows = selectedRows.filter(
      (row: number) => row < examSlot.rowStart || row > examSlot.rowEnd
    )

    if (invalidRows.length > 0) {
      return NextResponse.json(
        { error: `صفوف غير صحيحة: ${invalidRows.join(', ')}. النطاق الصحيح هو ${examSlot.rowStart}-${examSlot.rowEnd}` },
        { status: 400 }
      )
    }

    // Check for row conflicts
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

    // Update the booking
    const updateData: any = {}
    if (validated.firstName) updateData.firstName = validated.firstName
    if (validated.lastName) updateData.lastName = validated.lastName
    if (validated.email) updateData.email = validated.email
    if (validated.phone) updateData.phone = validated.phone
    if (validated.examSlotId) updateData.examSlotId = validated.examSlotId
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
      ? await prisma.examSlot.findUnique({ where: { id: updatedBooking.examSlotId || undefined } })
      : updatedBooking.examSlot

    if (!updatedSlot) {
      return NextResponse.json(
        { error: 'فترة الامتحان غير موجودة' },
        { status: 404 }
      )
    }

    // Send update email (always send, even if update is minor)
    try {
      const finalSelectedRows = validated.selectedRows || selectedRows
      const emailStartTime = updatedBooking.bookingStartTime || updatedSlot.startTime
      const emailDuration = updatedBooking.bookingDurationMinutes || updatedSlot.durationMinutes || 60
      
      console.log('Sending update email for booking:', updatedBooking.id, 'to:', updatedBooking.email)
      
      await sendBookingUpdateEmail({
        bookingId: updatedBooking.id,
        bookingReference: updatedBooking.bookingReference || updatedBooking.id,
        firstName: updatedBooking.firstName,
        lastName: updatedBooking.lastName,
        email: updatedBooking.email,
        date: updatedSlot.date.toISOString().split('T')[0],
        startTime: emailStartTime,
        durationMinutes: emailDuration,
        locationName: updatedSlot.locationName,
        selectedRows: finalSelectedRows,
        manageToken: updatedBooking.manageToken,
      })
      
      console.log('Update email sent successfully to:', updatedBooking.email)
    } catch (emailError) {
      console.error('Failed to send update email:', emailError)
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      booking: {
        ...updatedBooking,
        selectedRows: JSON.parse(updatedBooking.selectedRows),
        date: updatedSlot.date.toISOString().split('T')[0],
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'خطأ في التحقق', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'فشل تحديث الحجز' },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/manage/:token
export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { manageToken: params.token },
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

    // Send cancellation email BEFORE updating status (so we have exam slot info)
    // Use exam slot if available, otherwise use preserved info
    try {
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
      } else if (booking.preservedSlotDate) {
        // Use preserved info if exam slot was deleted
        bookingDate = booking.preservedSlotDate.toISOString().split('T')[0]
        locationName = booking.preservedLocationName || 'غير محدد'
        startTime = booking.bookingStartTime || '00:00'
        durationMinutes = booking.bookingDurationMinutes || 60
      } else {
        // Fallback if no info available
        bookingDate = new Date().toISOString().split('T')[0]
        locationName = 'غير محدد'
        startTime = booking.bookingStartTime || '00:00'
        durationMinutes = booking.bookingDurationMinutes || 60
      }
      
      console.log('Sending cancellation email for booking:', booking.id, 'to:', booking.email)
      
      await sendBookingCancellationEmail({
        bookingId: booking.id,
        bookingReference: booking.bookingReference || booking.id,
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        date: bookingDate,
        startTime: startTime,
        durationMinutes: durationMinutes,
        locationName: locationName,
        selectedRows,
        manageToken: booking.manageToken,
      })
      
      console.log('Cancellation email sent successfully to:', booking.email)
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError)
      // Continue with cancellation even if email fails
    }

    // Update booking status to CANCELLED
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ message: 'تم إلغاء الحجز بنجاح' })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'فشل إلغاء الحجز' },
      { status: 500 }
    )
  }
}

