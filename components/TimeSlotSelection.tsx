'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface TimeSlotSelectionProps {
  date: string
  durationMinutes: number
  onSlotSelect: (slot: any) => void
  onBack: () => void
}

export default function TimeSlotSelection({ date, durationMinutes, onSlotSelect, onBack }: TimeSlotSelectionProps) {
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSlots()
  }, [date, durationMinutes]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSlots = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/exam-slots/available?date=${date}&durationMinutes=${durationMinutes}`)
      const data = await response.json()
      
      if (data.error) {
        console.error('API Error:', data.error)
        setSlots([])
        return
      }
      
      if (data.slots) {
        // The API already filters by duration, but we can double-check
        // For new time window slots, check allowedDurations; for legacy slots, check durationMinutes
        const filteredSlots = data.slots.filter((slot: any) => {
          // New time window slots
          if (slot.allowedDurations && Array.isArray(slot.allowedDurations) && slot.allowedDurations.length > 0) {
            return slot.allowedDurations.includes(durationMinutes)
          }
          // Legacy slots
          return slot.durationMinutes === durationMinutes
        })
        setSlots(filteredSlots)
        
        // Debug: log if no slots found
        if (filteredSlots.length === 0 && data.slots.length > 0) {
          console.log('Slots found but none match duration:', {
            requestedDuration: durationMinutes,
            slots: data.slots.map((s: any) => ({
              id: s.id,
              startTime: s.startTime,
              endTime: s.endTime,
              allowedDurations: s.allowedDurations,
              durationMinutes: s.durationMinutes,
            })),
          })
        }
      } else {
        setSlots([])
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
      setSlots([])
    } finally {
      setLoading(false)
    }
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const period = hour >= 12 ? 'م' : 'ص'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${period}`
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          اختر الفترة الزمنية - {format(new Date(date), 'MMMM d, yyyy')}
        </h2>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base touch-target px-2 py-1"
        >
          تغيير المدة ←
        </button>
      </div>
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg sm:rounded-xl border border-blue-200">
        <p className="text-xs sm:text-sm text-blue-900 font-medium">
          عرض الفترات لـ: <strong className="text-blue-700">{formatDuration(durationMinutes)}</strong> مدة
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">جاري تحميل الفترات الزمنية المتاحة...</div>
      ) : slots.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-900 mb-4">
            لا توجد فترات زمنية متاحة لهذا التاريخ مع مدة {formatDuration(durationMinutes)}.
          </div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            جرب تاريخًا أو مدة مختلفة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => onSlotSelect(slot)}
              className="text-left p-5 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-teal-50 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xl font-bold text-gray-900">
                  {slot.endTime ? `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}` : formatTime(slot.startTime)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">{slot.locationName}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

