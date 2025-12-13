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
    await prisma.examSlot.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'تم حذف فترة الامتحان بنجاح' })
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

