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

    const result = await prisma.examSlot.deleteMany({
      where: {
        id: {
          in: validated.ids,
        },
      },
    })

    return NextResponse.json({
      message: `Deleted ${result.count} exam slot(s)`,
      deletedCount: result.count,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in bulk delete:', error)
    return NextResponse.json(
      { error: 'Failed to delete exam slots' },
      { status: 500 }
    )
  }
}



