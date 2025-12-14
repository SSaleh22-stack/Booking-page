import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
  isActive: z.boolean().optional(),
})

// PATCH /api/exam-slots/bulk - Bulk update (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = bulkActionSchema.parse(body)

    if (validated.isActive === undefined) {
      return NextResponse.json(
        { error: 'isActive field is required for bulk update' },
        { status: 400 }
      )
    }

    const result = await prisma.examSlot.updateMany({
      where: {
        id: {
          in: validated.ids,
        },
      },
      data: {
        isActive: validated.isActive,
      },
    })

    return NextResponse.json({
      message: `Updated ${result.count} exam slot(s)`,
      updatedCount: result.count,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in bulk update:', error)
    return NextResponse.json(
      { error: 'Failed to update exam slots' },
      { status: 500 }
    )
  }
}

// DELETE /api/exam-slots/bulk - Bulk delete
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = bulkActionSchema.parse(body)

    // First, find all exam slots and their confirmed bookings
    const examSlots = await prisma.examSlot.findMany({
      where: {
        id: {
          in: validated.ids,
        },
      },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED', // Only cancel confirmed bookings
          },
        },
      },
    })

    // Cancel all confirmed bookings associated with these slots
    let totalCancelledBookings = 0
    let emailsSent = 0
    let emailsFailed = 0
    
    if (examSlots.length > 0) {
      const { sendBookingCancellationEmail } = await import('@/lib/email')
      
      // Count bookings before updating (to get accurate count)
      for (const slot of examSlots) {
        totalCancelledBookings += slot.bookings.filter(b => b.status === 'CONFIRMED').length
      }
      
      // Send cancellation emails first (before updating status)
      for (const slot of examSlots) {
        for (const booking of slot.bookings) {
          if (booking.status === 'CONFIRMED') {
            try {
              const selectedRows = JSON.parse(booking.selectedRows) as number[]
              await sendBookingCancellationEmail({
                bookingId: booking.id,
                bookingReference: booking.bookingReference || booking.id,
                firstName: booking.firstName,
                lastName: booking.lastName,
                email: booking.email,
                date: slot.date.toISOString().split('T')[0],
                startTime: booking.bookingStartTime || slot.startTime,
                durationMinutes: booking.bookingDurationMinutes || slot.durationMinutes || 60,
                locationName: slot.locationName,
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
        }
      }

      console.log(`Sent ${emailsSent} cancellation emails, ${emailsFailed} failed`)

      // Update all bookings to CANCELLED status (they will remain in database)
      // Preserve exam slot information before setting examSlotId to null
      // We need to update each booking individually to preserve the correct slot info
      for (const slot of examSlots) {
        await prisma.booking.updateMany({
          where: {
            examSlotId: slot.id,
            status: 'CONFIRMED',
          },
          data: {
            status: 'CANCELLED',
            preservedSlotDate: slot.date, // Preserve the date
            preservedLocationName: slot.locationName, // Preserve the location
            examSlotId: null, // Set to null so we can delete the slot
          },
        })
      }
    }

    // Now delete the exam slots
    const result = await prisma.examSlot.deleteMany({
      where: {
        id: {
          in: validated.ids,
        },
      },
    })

    return NextResponse.json({
      message: `تم حذف ${result.count} فترة امتحان${totalCancelledBookings > 0 ? ` وتم إلغاء ${totalCancelledBookings} حجز` : ''}${emailsSent > 0 ? ` (تم إرسال ${emailsSent} رسالة إلغاء)` : ''}${emailsFailed > 0 ? ` (فشل إرسال ${emailsFailed} رسالة)` : ''}`,
      deletedCount: result.count,
      cancelledBookings: totalCancelledBookings,
      emailsSent,
      emailsFailed,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'خطأ في التحقق', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in bulk delete:', error)
    return NextResponse.json(
      { error: 'فشل حذف فترات الامتحان' },
      { status: 500 }
    )
  }
}



