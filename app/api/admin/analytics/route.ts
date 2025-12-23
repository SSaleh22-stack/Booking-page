import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/analytics - Get booking analytics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const where: any = {}

    // Filter by date range if provided
    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate)
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate + 'T23:59:59.999Z')
      }
    }

    // Get all bookings
    const allBookings = await prisma.booking.findMany({
      where,
      include: {
        examSlot: true,
      },
    })

    // Calculate statistics
    const totalBookings = allBookings.length
    const confirmedBookings = allBookings.filter(b => b.status === 'CONFIRMED').length
    const cancelledBookings = allBookings.filter(b => b.status === 'CANCELLED').length

    // Count rescheduled bookings (bookings that have been updated)
    const rescheduledBookings = allBookings.filter(b => {
      return b.updatedAt.getTime() !== b.createdAt.getTime()
    }).length

    // Count unique people (by email)
    const uniqueEmails = new Set(allBookings.map(b => b.email))
    const uniquePeople = uniqueEmails.size

    // Count bookings by date
    const bookingsByDate: { [key: string]: { total: number; confirmed: number; cancelled: number } } = {}
    allBookings.forEach(booking => {
      const dateKey = booking.createdAt.toISOString().split('T')[0]
      if (!bookingsByDate[dateKey]) {
        bookingsByDate[dateKey] = { total: 0, confirmed: 0, cancelled: 0 }
      }
      bookingsByDate[dateKey].total++
      if (booking.status === 'CONFIRMED') {
        bookingsByDate[dateKey].confirmed++
      } else if (booking.status === 'CANCELLED') {
        bookingsByDate[dateKey].cancelled++
      }
    })

    // Count bookings by exam slot date
    const bookingsByExamDate: { [key: string]: { total: number; confirmed: number; cancelled: number } } = {}
    allBookings.forEach(booking => {
      let dateKey: string
      if (booking.examSlot) {
        dateKey = booking.examSlot.date.toISOString().split('T')[0]
      } else if (booking.preservedSlotDate) {
        dateKey = booking.preservedSlotDate.toISOString().split('T')[0]
      } else {
        return // Skip if no date available
      }

      if (!bookingsByExamDate[dateKey]) {
        bookingsByExamDate[dateKey] = { total: 0, confirmed: 0, cancelled: 0 }
      }
      bookingsByExamDate[dateKey].total++
      if (booking.status === 'CONFIRMED') {
        bookingsByExamDate[dateKey].confirmed++
      } else if (booking.status === 'CANCELLED') {
        bookingsByExamDate[dateKey].cancelled++
      }
    })

    return NextResponse.json({
      summary: {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        rescheduledBookings,
        uniquePeople,
      },
      bookingsByDate: Object.entries(bookingsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({ date, ...stats })),
      bookingsByExamDate: Object.entries(bookingsByExamDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({ date, ...stats })),
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'فشل جلب الإحصائيات' },
      { status: 500 }
    )
  }
}




