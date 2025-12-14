'use client'

import { useState, useEffect } from 'react'
import { useNotification } from '@/hooks/useNotification'

interface RowSelectionProps {
  slot: any
  selectedStartTime?: string
  selectedDuration?: number
  onRowsSelect: (rows: number[]) => void
  onBack: () => void
  currentBookingRows?: number[] // Rows from current booking to exclude from conflicts
}

export default function RowSelection({ slot, selectedStartTime, selectedDuration, onRowsSelect, onBack, currentBookingRows }: RowSelectionProps) {
  const [numberOfRows, setNumberOfRows] = useState<number>(1)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const { showNotification, NotificationContainer } = useNotification()

  // Calculate available rows based on time conflicts
  const calculateAvailableRows = () => {
    if (!slot.endTime || !selectedStartTime || !selectedDuration) {
      // Legacy slot or no time selected - use simple availability
      return slot.stats?.availableRows || []
    }

    // For time window slots, check which rows are available for the selected time
    const [startHours, startMins] = selectedStartTime.split(':').map(Number)
    const bookingStartMinutes = startHours * 60 + startMins
    const bookingEndMinutes = bookingStartMinutes + selectedDuration

    const bookedRowsForTime = new Set<number>()
    
    // Check booked time slots for conflicts
    if (slot.bookedTimeSlots) {
      slot.bookedTimeSlots.forEach((bookedSlot: any) => {
        const [bookedStartHours, bookedStartMins] = bookedSlot.startTime.split(':').map(Number)
        const [bookedEndHours, bookedEndMins] = bookedSlot.endTime.split(':').map(Number)
        const bookedStartMinutes = bookedStartHours * 60 + bookedStartMins
        const bookedEndMinutes = bookedEndHours * 60 + bookedEndMins

        // Check if this booked slot matches the selected time exactly
        const isSameTime = bookedStartMinutes === bookingStartMinutes && bookedEndMinutes === bookingEndMinutes

        // Check if times overlap
        if (!(bookingEndMinutes <= bookedStartMinutes || bookingStartMinutes >= bookedEndMinutes)) {
          // Times overlap
          if (isSameTime && currentBookingRows) {
            // Same time and we have current booking rows - exclude all rows from this slot
            // This means all rows are available (they're from the current booking being rescheduled)
            // Don't add any rows to bookedRowsForTime
          } else {
            // Different time or no current booking rows - exclude current booking's rows only
            bookedSlot.rows.forEach((row: number) => {
              // If this is an update and the row is from current booking, don't mark it as booked
              if (!currentBookingRows || !currentBookingRows.includes(row)) {
                bookedRowsForTime.add(row)
              }
            })
          }
        }
      })
    }

    // Return rows that are not booked during the selected time
    const allRows = Array.from({ length: slot.rowEnd - slot.rowStart + 1 }, (_, i) => slot.rowStart + i)
    return allRows.filter(row => !bookedRowsForTime.has(row))
  }

  const availableRows = calculateAvailableRows()
  const bookedRows = slot.stats?.bookedRowsList || []
  const maxRows = availableRows.length
  const totalRows = slot.rowEnd - slot.rowStart + 1
  const remainingRows = availableRows.length

  // Auto-select rows when number changes
  useEffect(() => {
    if (numberOfRows > 0 && numberOfRows <= maxRows) {
      // Select consecutive rows starting from the first available
      const rows = availableRows.slice(0, numberOfRows)
      setSelectedRows(rows)
    } else {
      setSelectedRows([])
    }
  }, [numberOfRows, maxRows, availableRows])

  const handleContinue = () => {
    if (selectedRows.length === 0) {
      showNotification('يرجى اختيار صف واحد على الأقل', 'error')
      return
    }
    onRowsSelect(selectedRows)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">اختر الصفوف</h2>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800"
        >
          تغيير الفترة الزمنية ←
        </button>
      </div>

      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
        <p className="text-gray-700 mb-2 font-medium">
          📍 الموقع: <span className="font-bold text-blue-900">{slot.locationName}</span>
        </p>
        <p className="text-gray-700">
          ✅ الصفوف المتاحة: <span className="font-bold text-green-700">{remainingRows}</span> من <span className="font-semibold">{totalRows}</span>
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          عدد الصفوف المطلوبة:
        </label>
        <select
          value={numberOfRows}
          onChange={(e) => setNumberOfRows(parseInt(e.target.value))}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
        >
          {Array.from({ length: maxRows }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? 'صف' : 'صفوف'}
            </option>
          ))}
        </select>
        {maxRows === 0 && (
          <p className="text-sm text-red-600 mt-2">لا توجد صفوف متاحة</p>
        )}
      </div>

      {/* Selected rows summary - always show */}
      <div className="mb-6">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-900 font-semibold mb-1">
            الصفوف المحددة:
          </p>
          {selectedRows.length > 0 ? (
            <>
              <p className="text-base sm:text-lg font-bold text-blue-900 break-words">
                {selectedRows.sort((a, b) => a - b).join(', ')}
              </p>
              <p className="text-sm sm:text-base text-blue-700 mt-2 font-medium">
                عدد الصفوف: {selectedRows.length} {selectedRows.length === 1 ? 'صف' : 'صفوف'}
              </p>
            </>
          ) : (
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              لم يتم اختيار صفوف بعد
            </p>
          )}
          {selectedStartTime && selectedDuration && (
            <p className="text-xs sm:text-sm text-blue-700 mt-2">
              الوقت: {selectedStartTime} • المدة: {selectedDuration} دقيقة
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleContinue}
          disabled={selectedRows.length === 0}
          className="flex-1 bg-gradient-to-r from-blue-700 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-blue-800 hover:to-teal-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          متابعة
        </button>
        <button
          onClick={onBack}
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
        >
          رجوع
        </button>
      </div>

      <NotificationContainer />
    </div>
  )
}

