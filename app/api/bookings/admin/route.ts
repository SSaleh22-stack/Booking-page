import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/bookings/admin?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&status=CONFIRMED
// Returns all bookings for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const status = searchParams.get('status')

    const where: any = {}

    // Filter by date range if provided
    if (fromDate || toDate) {
      where.examSlot = {
        date: {},
      }
      if (fromDate) {
        where.examSlot.date.gte = new Date(fromDate)
      }
      if (toDate) {
        where.examSlot.date.lte = new Date(toDate)
      }
    }

    // Filter by status if provided
    if (status) {
      where.status = status
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        examSlot: true,
      },
      orderBy: [
        {
          examSlot: {
            date: 'asc',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
    })

    // Format bookings for response
    const formattedBookings = bookings
      .filter((booking) => booking.examSlot !== null) // Filter out bookings without exam slot
      .map((booking) => {
        let selectedRows: number[] = []
        try {
          selectedRows = JSON.parse(booking.selectedRows) as number[]
        } catch {
          // Invalid JSON
        }

        // TypeScript now knows examSlot is not null after filter
        const examSlot = booking.examSlot!

        return {
          id: booking.id,
          bookingReference: booking.bookingReference,
          examSlotId: booking.examSlotId,
          date: examSlot.date.toISOString().split('T')[0],
          startTime: booking.bookingStartTime || examSlot.startTime,
          durationMinutes: booking.bookingDurationMinutes || examSlot.durationMinutes || 60,
          locationName: examSlot.locationName,
          rowStart: examSlot.rowStart,
          rowEnd: examSlot.rowEnd,
          selectedRows,
          selectedRowsCount: selectedRows.length,
          firstName: booking.firstName,
          lastName: booking.lastName,
          email: booking.email,
          phone: booking.phone,
          status: booking.status,
          manageToken: booking.manageToken,
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
        }
      })

    return NextResponse.json({ bookings: formattedBookings })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

