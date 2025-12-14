import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateExamSlotSchema } from '@/lib/validations'
import { z } from 'zod'

// GET /api/exam-slots/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const slot = await prisma.examSlot.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
          },
        },
      },
    })

    if (!slot) {
      return NextResponse.json(
        { error: 'فترة الامتحان غير موجودة' },
        { status: 404 }
      )
    }

    const bookedRows = new Set<number>()
    slot.bookings.forEach((booking) => {
      try {
        const rows = JSON.parse(booking.selectedRows) as number[]
        rows.forEach((row) => bookedRows.add(row))
      } catch (e) {
        // Invalid JSON, skip
      }
    })

    const totalRows = slot.rowEnd - slot.rowStart + 1
    const bookedCount = bookedRows.size
    const remainingCount = totalRows - bookedCount

    return NextResponse.json({
      ...slot,
      date: slot.date.toISOString().split('T')[0],
      stats: {
        totalRows,
        bookedRows: bookedCount,
        remainingRows: remainingCount,
      },
    })
  } catch (error) {
    console.error('Error fetching exam slot:', error)
    return NextResponse.json(
      { error: 'فشل جلب فترة الامتحان' },
      { status: 500 }
    )
  }
}

// PATCH /api/exam-slots/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = updateExamSlotSchema.parse(body)

    // Convert date string to Date if provided
    const updateData: any = { ...validated }
    if (validated.date) {
      updateData.date = new Date(validated.date)
    }
    
    // Handle allowedDurations - convert array to JSON string if needed
    if (validated.allowedDurations !== undefined) {
      if (Array.isArray(validated.allowedDurations)) {
        updateData.allowedDurations = JSON.stringify(validated.allowedDurations)
      } else if (typeof validated.allowedDurations === 'string') {
        updateData.allowedDurations = validated.allowedDurations
      }
    }

    const slot = await prisma.examSlot.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ slot })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'خطأ في التحقق', details: error.errors },
        { status: 400 }
      )
    }

    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'فترة الامتحان غير موجودة' },
        { status: 404 }
      )
    }

    console.error('Error updating exam slot:', error)
    return NextResponse.json(
      { error: 'فشل تحديث فترة الامتحان' },
      { status: 500 }
    )
  }
}

// DELETE /api/exam-slots/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First, find the exam slot and its bookings
    const examSlot = await prisma.examSlot.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED', // Only cancel confirmed bookings
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

    // Cancel all confirmed bookings associated with this slot
    let emailsSent = 0
    let emailsFailed = 0
    
    if (examSlot.bookings.length > 0) {
      const { sendBookingCancellationEmail } = await import('@/lib/email')
      
      // Send cancellation emails first (before updating status)
      for (const booking of examSlot.bookings) {
        try {
          const selectedRows = JSON.parse(booking.selectedRows) as number[]
          await sendBookingCancellationEmail({
            bookingId: booking.id,
            bookingReference: booking.bookingReference || booking.id,
            firstName: booking.firstName,
            lastName: booking.lastName,
            email: booking.email,
            date: examSlot.date.toISOString().split('T')[0],
            startTime: booking.bookingStartTime || examSlot.startTime,
            durationMinutes: booking.bookingDurationMinutes || examSlot.durationMinutes || 60,
            locationName: examSlot.locationName,
            selectedRows,
            manageToken: booking.manageToken,
          })
          emailsSent++
          console.log(`Cancellation email sent successfully to ${booking.email} for booking ${booking.id}`)
        } catch (emailError) {
          emailsFailed++
          console.error(`Failed to send cancellation email for booking ${booking.id} to ${booking.email}:`, emailError)
          // Continue with other bookings even if one email fails
        }
      }

      console.log(`Sent ${emailsSent} cancellation emails, ${emailsFailed} failed`)

      // Update all bookings to CANCELLED status (they will remain in database)
      // Set examSlotId to null so we can delete the slot
      await prisma.booking.updateMany({
        where: {
          examSlotId: params.id,
          status: 'CONFIRMED',
        },
        data: {
          status: 'CANCELLED',
          examSlotId: null, // Set to null so we can delete the slot
        },
      })
    }

    // Now delete the exam slot
    // Bookings are already cancelled and examSlotId is set to null, so deletion is allowed
    await prisma.examSlot.delete({
      where: { id: params.id },
    })

    const cancelledCount = examSlot.bookings.length
    
    return NextResponse.json({
      message: `تم حذف فترة الامتحان بنجاح${cancelledCount > 0 ? ` وتم إلغاء ${cancelledCount} حجز` : ''}${emailsSent > 0 ? ` (تم إرسال ${emailsSent} رسالة إلغاء)` : ''}${emailsFailed > 0 ? ` (فشل إرسال ${emailsFailed} رسالة)` : ''}`,
      cancelledBookings: cancelledCount,
      emailsSent,
      emailsFailed,
    })
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'فترة الامتحان غير موجودة' },
        { status: 404 }
      )
    }

    console.error('Error deleting exam slot:', error)
    return NextResponse.json(
      { error: 'فشل حذف فترة الامتحان' },
      { status: 500 }
    )
  }
}

