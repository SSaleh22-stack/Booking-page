import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/exam-slots/available?date=YYYY-MM-DD&durationMinutes=60
// Returns available exam slots for a specific date, optionally filtered by duration
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const durationMinutes = searchParams.get('durationMinutes')
    const excludeBookingId = searchParams.get('excludeBookingId') // For rescheduling - exclude current booking

    if (!date) {
      return NextResponse.json(
        { error: 'معامل التاريخ مطلوب' },
        { status: 400 }
      )
    }

    // Parse date - use date string directly for PostgreSQL date comparison
    // PostgreSQL date type compares correctly with date strings
    const dateStr = date.split('T')[0] // Ensure we only have YYYY-MM-DD
    const startOfDay = new Date(dateStr)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(dateStr)
    endOfDay.setUTCHours(23, 59, 59, 999)

    // Check if the date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (startOfDay < today) {
      return NextResponse.json(
        { error: 'لا يمكن الحجز في التواريخ الماضية', slots: [] },
        { status: 400 }
      )
    }

    const where: any = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isActive: true,
    }

    const slots = await prisma.examSlot.findMany({
      where,
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
            ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // Filter by duration if provided (check if duration is in allowedDurations)
    let filteredSlots = slots
    if (durationMinutes) {
      const requestedDuration = parseInt(durationMinutes)
      filteredSlots = slots.filter(slot => {
        // Legacy slots (no endTime/allowedDurations)
        if (!slot.endTime || !slot.allowedDurations) {
          return slot.durationMinutes === requestedDuration
        }
        // New time window slots
        try {
          const allowedDurations = typeof slot.allowedDurations === 'string'
            ? JSON.parse(slot.allowedDurations)
            : slot.allowedDurations
          return Array.isArray(allowedDurations) && allowedDurations.includes(requestedDuration)
        } catch {
          return false
        }
      })
    }

    // Calculate availability for each slot
    const slotsWithAvailability = filteredSlots.map((slot) => {
      const bookedRows = new Set<number>()
      const bookedTimeSlots: Array<{ startTime: string, endTime: string, rows: number[] }> = []
      
      slot.bookings.forEach((booking) => {
        try {
          const rows = JSON.parse(booking.selectedRows) as number[]
          rows.forEach((row) => bookedRows.add(row))
          
          // Track booked time slots for time window slots
          if (booking.bookingStartTime && booking.bookingDurationMinutes) {
            const [startHours, startMins] = booking.bookingStartTime.split(':').map(Number)
            const startTotal = startHours * 60 + startMins
            const endTotal = startTotal + booking.bookingDurationMinutes
            const endHours = Math.floor(endTotal / 60) % 24
            const endMins = endTotal % 60
            const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
            bookedTimeSlots.push({
              startTime: booking.bookingStartTime,
              endTime,
              rows,
            })
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      })

      const totalRows = slot.rowEnd - slot.rowStart + 1
      
      // For time window slots, row availability depends on time
      // For now, we'll show all rows as potentially available
      // The actual conflict check happens during booking based on selected time
      let bookedCount = 0
      let remainingCount = totalRows
      const availableRows: number[] = []

      if (slot.endTime && bookedTimeSlots.length > 0) {
        // For time window slots, we can't determine exact availability without knowing the requested time
        // So we show all rows as available, and conflict checking happens during booking
        for (let i = slot.rowStart; i <= slot.rowEnd; i++) {
          availableRows.push(i)
        }
        remainingCount = totalRows // Optimistic - actual check happens during booking
      } else {
        // Legacy slots - simple row-based availability
        bookedCount = bookedRows.size
        remainingCount = totalRows - bookedCount
        for (let i = slot.rowStart; i <= slot.rowEnd; i++) {
          if (!bookedRows.has(i)) {
            availableRows.push(i)
          }
        }
      }

      // Parse allowed durations
      let allowedDurations: number[] = []
      if (slot.allowedDurations) {
        try {
          allowedDurations = typeof slot.allowedDurations === 'string'
            ? JSON.parse(slot.allowedDurations)
            : slot.allowedDurations
        } catch {
          allowedDurations = []
        }
      }

      return {
        id: slot.id,
        date: slot.date.toISOString().split('T')[0],
        startTime: slot.startTime,
        endTime: slot.endTime,
        allowedDurations: allowedDurations.length > 0 ? allowedDurations : (slot.durationMinutes ? [slot.durationMinutes] : []),
        durationMinutes: slot.durationMinutes, // Legacy field
        locationName: slot.locationName,
        rowStart: slot.rowStart,
        rowEnd: slot.rowEnd,
        defaultSeatsPerRow: slot.defaultSeatsPerRow,
        bookedTimeSlots, // For time conflict checking
        stats: {
          totalRows,
          bookedRows: bookedCount,
          remainingRows: remainingCount,
          availableRows,
          bookedRowsList: Array.from(bookedRows),
        },
      }
    })

    return NextResponse.json({ slots: slotsWithAvailability })
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { error: 'فشل جلب الفترات المتاحة' },
      { status: 500 }
    )
  }
}

