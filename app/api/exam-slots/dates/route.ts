import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/exam-slots/dates?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
// Returns list of dates that have at least one active exam slot
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    // Get today's date at midnight (start of day) to exclude past dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const where: any = {
      isActive: true,
      date: {
        gte: today, // Only include dates from today onwards
      },
    }

    if (fromDate || toDate) {
      if (!where.date) {
        where.date = {}
      }
      if (fromDate) {
        const fromDateObj = new Date(fromDate)
        // Use the later of today or fromDate
        where.date.gte = fromDateObj > today ? fromDateObj : today
      }
      if (toDate) {
        where.date.lte = new Date(toDate)
      }
    }

    const slots = await prisma.examSlot.findMany({
      where,
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Group slots by date and check if each date has at least one slot with available rows
    const dateAvailability = new Map<string, boolean>()

    slots.forEach((slot) => {
      const dateStr = slot.date.toISOString().split('T')[0]
      
      // Skip if already marked as available
      if (dateAvailability.get(dateStr) === true) {
        return
      }

      // Check day exceptions
      if (slot.dayExceptions) {
        try {
          const exceptions = typeof slot.dayExceptions === 'string' 
            ? JSON.parse(slot.dayExceptions) 
            : slot.dayExceptions
          if (Array.isArray(exceptions) && exceptions.length > 0) {
            const dayOfWeek = slot.date.getDay()
            if (exceptions.includes(dayOfWeek)) {
              return // Skip this slot due to day exception
            }
          }
        } catch {
          // If parsing fails, continue
        }
      }

      // Calculate booked rows for this slot
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
      const availableRows = totalRows - bookedRows.size

      // If this slot has available rows, mark the date as available
      if (availableRows > 0) {
        dateAvailability.set(dateStr, true)
      } else if (!dateAvailability.has(dateStr)) {
        // Only set to false if not already set to true
        dateAvailability.set(dateStr, false)
      }
    })

    // Return only dates that have at least one slot with available rows
    const dates = Array.from(dateAvailability.entries())
      .filter(([_, hasAvailability]) => hasAvailability)
      .map(([dateStr, _]) => dateStr)
      .sort()

    return NextResponse.json({ dates })
  } catch (error) {
    console.error('Error fetching available dates:', error)
    return NextResponse.json(
      { error: 'فشل جلب التواريخ المتاحة' },
      { status: 500 }
    )
  }
}

