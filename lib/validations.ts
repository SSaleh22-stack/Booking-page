import { z } from 'zod'

export const examSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
  allowedDurations: z.array(z.number().int().min(15).max(480)), // Array of allowed durations in minutes
  locationName: z.string().min(1, 'Location name is required'),
  rowStart: z.number().int().min(1),
  rowEnd: z.number().int().min(1),
  defaultSeatsPerRow: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional().default(true),
})

export const createExamSlotSchema = examSlotSchema.extend({
  repeatPattern: z.enum(['none', 'daily']).optional().default('none'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
})

// Schema for bulk creation with multiple date ranges and time windows
export const bulkCreateExamSlotSchema = z.object({
  dateRanges: z.array(z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  })).min(1, 'At least one date range is required'),
  timeWindows: z.array(z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
    allowedDurations: z.array(z.number().int().min(15).max(480)),
  })).min(1, 'At least one time window is required'),
  locationName: z.string().min(1, 'Location name is required'),
  rowStart: z.number().int().min(1),
  rowEnd: z.number().int().min(1),
  defaultSeatsPerRow: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  dayExceptions: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sunday, 1=Monday, ..., 6=Saturday
})

export const updateExamSlotSchema = examSlotSchema.partial().extend({
  allowedDurations: z.union([
    z.array(z.number().int().min(15).max(480)),
    z.string(), // Allow JSON string for backward compatibility
  ]).optional(),
})

export const bookingSchema = z.object({
  examSlotId: z.string().uuid(),
  bookingStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
  bookingDurationMinutes: z.number().int().min(15).max(480),
  selectedRows: z.array(z.number().int().positive()),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
})

export const updateBookingSchema = bookingSchema.partial().extend({
  examSlotId: z.string().uuid().optional(),
  selectedRows: z.array(z.number().int().positive()).optional(),
})

