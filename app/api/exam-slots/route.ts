import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createExamSlotSchema, bulkCreateExamSlotSchema } from '@/lib/validations'
import { z } from 'zod'

// GET /api/exam-slots
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}

    if (fromDate || toDate) {
      where.date = {}
      if (fromDate) {
        where.date.gte = new Date(fromDate)
      }
      if (toDate) {
        where.date.lte = new Date(toDate)
      }
    }

    if (!includeInactive) {
      where.isActive = true
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
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    })

    // Calculate booked rows for each slot
    const slotsWithStats = slots.map((slot) => {
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

      return {
        id: slot.id,
        date: slot.date.toISOString().split('T')[0],
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
        locationName: slot.locationName,
        rowStart: slot.rowStart,
        rowEnd: slot.rowEnd,
        defaultSeatsPerRow: slot.defaultSeatsPerRow,
        isActive: slot.isActive,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
        stats: {
          totalRows,
          bookedRows: bookedCount,
          remainingRows: remainingCount,
        },
      }
    })

    return NextResponse.json({ slots: slotsWithStats })
  } catch (error) {
    console.error('Error fetching exam slots:', error)
    return NextResponse.json(
      { error: 'فشل جلب فترات الامتحان' },
      { status: 500 }
    )
  }
}

// POST /api/exam-slots
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a bulk creation request (has dateRanges and timeWindows arrays)
    if (body.dateRanges && Array.isArray(body.dateRanges) && body.timeWindows && Array.isArray(body.timeWindows)) {
      const validated = bulkCreateExamSlotSchema.parse(body)
      
      const slots = []
      
      // Create slots for each date range and each time window combination
      for (const dateRange of validated.dateRanges) {
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        
        // Iterate through each day in the date range
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Skip days that match day exceptions (0=Sunday, 1=Monday, ..., 6=Saturday)
          const dayOfWeek = d.getDay()
          if (validated.dayExceptions && validated.dayExceptions.includes(dayOfWeek)) {
            continue // Skip this day
          }
          
          // Create a slot for each time window
          for (const timeWindow of validated.timeWindows) {
            // Calculate duration from time window for legacy compatibility
            const [startHours, startMins] = timeWindow.startTime.split(':').map(Number)
            const [endHours, endMins] = timeWindow.endTime.split(':').map(Number)
            const startMinutes = startHours * 60 + startMins
            const endMinutes = endHours * 60 + endMins
            const windowDuration = endMinutes - startMinutes
            
            const slot = await prisma.examSlot.create({
              data: {
                date: new Date(d),
                startTime: timeWindow.startTime,
                endTime: timeWindow.endTime,
                allowedDurations: JSON.stringify(timeWindow.allowedDurations),
                durationMinutes: windowDuration, // Set to window duration for legacy compatibility
                locationName: validated.locationName,
                rowStart: validated.rowStart,
                rowEnd: validated.rowEnd,
                defaultSeatsPerRow: validated.defaultSeatsPerRow,
                isActive: validated.isActive,
                dayExceptions: validated.dayExceptions && validated.dayExceptions.length > 0 
                  ? JSON.stringify(validated.dayExceptions) 
                  : null,
              },
            })
            slots.push(slot)
          }
        }
      }

      return NextResponse.json({ 
        slots, 
        message: `Created ${slots.length} exam slots` 
      }, { status: 201 })
    }

    // Original single slot creation logic (for backward compatibility)
    const validated = createExamSlotSchema.parse(body)
    const { repeatPattern, endDate, ...slotData } = validated

    // Convert allowedDurations array to JSON string if provided
    const createData: any = { ...slotData }
    if (createData.allowedDurations && Array.isArray(createData.allowedDurations)) {
      createData.allowedDurations = JSON.stringify(createData.allowedDurations)
    }

    // If repeatPattern is 'daily' and endDate is provided, create multiple slots
    if (repeatPattern === 'daily' && endDate) {
      const startDate = new Date(validated.date)
      const finalDate = new Date(endDate)
      const slots = []

      for (let d = new Date(startDate); d <= finalDate; d.setDate(d.getDate() + 1)) {
        const slot = await prisma.examSlot.create({
          data: {
            ...createData,
            date: new Date(d),
          },
        })
        slots.push(slot)
      }

      return NextResponse.json({ slots, message: `Created ${slots.length} exam slots` }, { status: 201 })
    } else {
      // Single slot
      const slot = await prisma.examSlot.create({
        data: {
          ...createData,
          date: new Date(validated.date),
        },
      })

      return NextResponse.json({ slot }, { status: 201 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { 
          error: 'خطأ في التحقق', 
          details: error.errors,
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      )
    }

    console.error('Error creating exam slot:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'فشل إنشاء فترة الامتحان',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

