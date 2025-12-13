'use client'

import { useState } from 'react'

interface TimeSelectionProps {
  slot: any
  durationMinutes: number
  onTimeSelect: (startTime: string) => void
  onBack: () => void
}

export default function TimeSelection({ slot, durationMinutes, onTimeSelect, onBack }: TimeSelectionProps) {

  // Generate available start times within the window
  const generateAvailableTimes = () => {
    if (!slot.endTime) {
      // Legacy slot - just return the start time
      return [slot.startTime]
    }

    const [startHours, startMins] = slot.startTime.split(':').map(Number)
    const [endHours, endMins] = slot.endTime.split(':').map(Number)
    const windowStartMinutes = startHours * 60 + startMins
    const windowEndMinutes = endHours * 60 + endMins

    const availableTimes: string[] = []
    let currentMinutes = windowStartMinutes

    // Always generate times at hourly intervals (every hour: 8:00, 9:00, 10:00, etc.)
    // The duration is used to check if the time + duration fits within the window
    const interval = 60 // Always use 1 hour interval

    while (currentMinutes + durationMinutes <= windowEndMinutes) {
      const hours = Math.floor(currentMinutes / 60) % 24
      const mins = currentMinutes % 60
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
      availableTimes.push(timeStr)
      currentMinutes += interval // Always increment by 1 hour
    }

    return availableTimes
  }

  const availableTimes = generateAvailableTimes()

  // Check row availability for each time
  const checkTimeAvailability = (time: string) => {
    if (!slot.endTime || !slot.bookedTimeSlots) {
      // Legacy slot or no booked slots - assume available
      return { available: true, availableRows: slot.stats?.totalRows || 0 }
    }

    const [startHours, startMins] = time.split(':').map(Number)
    const bookingStartMinutes = startHours * 60 + startMins
    const bookingEndMinutes = bookingStartMinutes + durationMinutes

    // Find rows that are booked during this time
    const bookedRowsForTime = new Set<number>()
    
    slot.bookedTimeSlots.forEach((bookedSlot: any) => {
      const [bookedStartHours, bookedStartMins] = bookedSlot.startTime.split(':').map(Number)
      const [bookedEndHours, bookedEndMins] = bookedSlot.endTime.split(':').map(Number)
      const bookedStartMinutes = bookedStartHours * 60 + bookedStartMins
      const bookedEndMinutes = bookedEndHours * 60 + bookedEndMins

      // Check if times overlap
      if (!(bookingEndMinutes <= bookedStartMinutes || bookingStartMinutes >= bookedEndMinutes)) {
        // Times overlap - these rows are not available
        bookedSlot.rows.forEach((row: number) => bookedRowsForTime.add(row))
      }
    })

    const totalRows = slot.rowEnd - slot.rowStart + 1
    const availableRows = totalRows - bookedRowsForTime.size

    return {
      available: availableRows > 0,
      availableRows,
      totalRows,
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const period = hour >= 12 ? 'م' : 'ص'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${period}`
  }

  const formatDuration = (minutes: number) => {
    if (minutes === 60) return 'ساعة واحدة'
    if (minutes === 120) return 'ساعتان'
    if (minutes === 90) return 'ساعة ونصف'
    if (minutes === 180) return '3 ساعات'
    if (minutes === 30) return '30 دقيقة'
    if (minutes === 150) return 'ساعتان ونصف'
    if (minutes === 240) return '4 ساعات'
    return `${minutes} دقيقة`
  }

  const calculateEndTime = (startTime: string) => {
    const [hours, mins] = startTime.split(':').map(Number)
    const startTotal = hours * 60 + mins
    const endTotal = startTotal + durationMinutes
    const endHours = Math.floor(endTotal / 60) % 24
    const endMins = endTotal % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
  }

  const handleTimeSelect = (time: string) => {
    const availability = checkTimeAvailability(time)
    if (availability.available) {
      onTimeSelect(time)
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        تغيير الفترة الزمنية
      </button>
      
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">اختر وقت البدء</h2>
      </div>

      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-blue-700 font-semibold">النافذة الزمنية:</span>
            <span className="mr-2 text-blue-900">{formatTime(slot.startTime)} - {formatTime(slot.endTime || slot.startTime)}</span>
          </div>
          <div>
            <span className="text-blue-700 font-semibold">المدة:</span>
            <span className="mr-2 text-blue-900">{formatDuration(durationMinutes)}</span>
          </div>
          <div>
            <span className="text-blue-700 font-semibold">الموقع:</span>
            <span className="mr-2 text-blue-900">{slot.locationName}</span>
          </div>
        </div>
      </div>

      {availableTimes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          لا توجد أوقات بدء متاحة لهذه المدة ضمن النافذة الزمنية.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              اختر وقت البدء:
            </label>
            {availableTimes.every(time => !checkTimeAvailability(time).available) && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ جميع الأوقات غير متاحة حاليًا. يرجى تجربة تاريخ أو مدة مختلفة.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 items-stretch">
              {availableTimes.map((time) => {
                const availability = checkTimeAvailability(time)
                const isAvailable = availability.available

                return (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    disabled={!isAvailable}
                    className={`
                      p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-right transition-all touch-target flex flex-col items-end justify-between h-full
                      ${isAvailable
                        ? 'border-gray-200 bg-white hover:border-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-teal-50 cursor-pointer shadow-sm hover:shadow-md active:scale-95'
                        : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className={`font-bold text-base sm:text-lg mb-1 sm:mb-2 text-right w-full ${isAvailable ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formatTime(time)}
                    </div>
                    {isAvailable ? (
                      <div className="flex items-center gap-1 text-xs text-green-700 font-semibold justify-end w-full flex-row-reverse">
                        <span>{availability.availableRows} صفوف متاحة</span>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-red-600 font-semibold justify-end w-full flex-row-reverse">
                        <span>لا توجد صفوف متاحة</span>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

