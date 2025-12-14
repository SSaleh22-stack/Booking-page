import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  sendBookingConfirmationEmail,
  sendBookingUpdateEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
} from '@/lib/email'

// POST /api/admin/send-test-email - Send a test email of a specific type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailType, email } = body

    if (!emailType || !email) {
      return NextResponse.json(
        { error: 'نوع الرسالة والبريد الإلكتروني مطلوبان' },
        { status: 400 }
      )
    }

    // Get the first confirmed booking for testing
    const booking = await prisma.booking.findFirst({
      where: {
        status: 'CONFIRMED',
      },
      include: {
        examSlot: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'لا توجد حجوزات متاحة لإرسال رسالة تجريبية' },
        { status: 404 }
      )
    }

    const selectedRows = JSON.parse(booking.selectedRows) as number[]
    const emailData = {
      bookingId: booking.id,
      bookingReference: booking.bookingReference || booking.id,
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: email, // Use provided email instead of booking email
      date: booking.examSlot.date.toISOString().split('T')[0],
      startTime: booking.bookingStartTime || booking.examSlot.startTime,
      durationMinutes: booking.bookingDurationMinutes || booking.examSlot.durationMinutes || 60,
      locationName: booking.examSlot.locationName,
      selectedRows,
      manageToken: booking.manageToken,
    }

    let result

    switch (emailType) {
      case 'confirmation':
        await sendBookingConfirmationEmail(emailData)
        result = 'تم إرسال رسالة التأكيد بنجاح'
        break

      case 'update':
        await sendBookingUpdateEmail(emailData)
        result = 'تم إرسال رسالة التحديث بنجاح'
        break

      case 'cancellation':
        await sendBookingCancellationEmail(emailData)
        result = 'تم إرسال رسالة الإلغاء بنجاح'
        break

      case 'reminder':
        await sendBookingReminderEmail(emailData)
        result = 'تم إرسال رسالة التذكير بنجاح'
        break

      default:
        return NextResponse.json(
          { error: 'نوع الرسالة غير صحيح' },
          { status: 400 }
        )
    }

    return NextResponse.json({ message: result })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      {
        error: 'فشل إرسال الرسالة: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'),
      },
      { status: 500 }
    )
  }
}

