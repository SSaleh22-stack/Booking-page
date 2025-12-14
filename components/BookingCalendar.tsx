'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns'

interface BookingCalendarProps {
  onDateSelect: (date: string) => void
}

export default function BookingCalendar({ onDateSelect }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAvailableDates()
  }, [currentMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAvailableDates = async () => {
    try {
      setLoading(true)
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      
      const response = await fetch(
        `/api/exam-slots/dates?fromDate=${format(monthStart, 'yyyy-MM-dd')}&toDate=${format(monthEnd, 'yyyy-MM-dd')}`
      )
      const data = await response.json()
      
      if (data.error) {
        console.error('Error fetching dates:', data.error)
        setAvailableDates(new Set())
        return
      }
      
      if (data.dates) {
        setAvailableDates(new Set(data.dates))
      } else {
        setAvailableDates(new Set())
      }
    } catch (error) {
      console.error('Error fetching available dates:', error)
      setAvailableDates(new Set())
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add empty cells for days before month start
  const firstDayOfWeek = monthStart.getDay()
  const emptyDays = Array(firstDayOfWeek).fill(null)

  const isDateAvailable = (date: Date) => {
    // Check if date is in the past
    const today = startOfDay(new Date())
    const dateToCheck = startOfDay(date)
    
    if (isBefore(dateToCheck, today)) {
      return false // Past dates are not available
    }
    
    const dateStr = format(date, 'yyyy-MM-dd')
    return availableDates.has(dateStr)
  }

  const handleDateClick = (date: Date) => {
    if (isDateAvailable(date)) {
      onDateSelect(format(date, 'yyyy-MM-dd'))
    }
  }

  // Check if there are any available dates at all
  const hasAvailableDates = availableDates.size > 0

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">اختر التاريخ</h2>
      
      {loading ? (
        <div className="text-center py-6 sm:py-8 text-sm sm:text-base">جاري تحميل التواريخ المتاحة...</div>
      ) : !hasAvailableDates ? (
        <div className="text-center py-8 sm:py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 sm:p-8">
            <div className="text-4xl sm:text-5xl mb-4">📅</div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">لا توجد حجوزات متاحة</h3>
            <p className="text-sm sm:text-base text-gray-600">
              لا توجد فترات امتحان متاحة حالياً. يرجى المحاولة لاحقاً.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 sm:mb-6 bg-gray-50 p-3 sm:p-4 rounded-lg">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors font-medium text-sm sm:text-base text-black touch-target"
            >
              السابق
            </button>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors font-medium text-sm sm:text-base text-black touch-target"
            >
              التالي
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 place-items-center">
            {/* Day headers */}
            {['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map((day) => (
              <div key={day} className="text-center font-semibold text-gray-600 py-1 sm:py-2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center text-xs sm:text-sm">
                {day}
              </div>
            ))}

            {/* Empty cells for days before month start */}
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" />
            ))}

            {/* Calendar days */}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const available = isDateAvailable(day)
              const isToday = isSameDay(day, new Date())
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()))

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  disabled={!available || isPast}
                  className={`
                    h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full transition-all font-medium flex items-center justify-center text-xs sm:text-sm md:text-base touch-target
                    ${available && !isPast
                      ? 'bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 cursor-pointer shadow-sm hover:shadow-md active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 sm:ring-offset-2' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-900">
            <p>• التواريخ باللون الأزرق لديها فترات امتحان متاحة</p>
            <p>• انقر على تاريخ متاح للمتابعة</p>
          </div>
        </>
      )}
    </div>
  )
}

