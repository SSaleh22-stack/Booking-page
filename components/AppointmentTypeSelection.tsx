'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface AppointmentTypeSelectionProps {
  date: string
  onSelect: (durationMinutes: number) => void
  onBack: () => void
}

export default function AppointmentTypeSelection({ date, onSelect, onBack }: AppointmentTypeSelectionProps) {
  const [availableDurations, setAvailableDurations] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAvailableDurations()
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAvailableDurations = async () => {
    try {
      setLoading(true)
      // Fetch all slots for this date to get available durations
      const response = await fetch(`/api/exam-slots/available?date=${date}`)
      const data = await response.json()
      
      if (data.error) {
        console.error('API Error:', data.error)
        setAvailableDurations([])
        return
      }
      
      if (data.slots) {
        // Extract all unique durations from available slots
        const durations = new Set<number>()
        data.slots.forEach((slot: any) => {
          if (slot.allowedDurations && Array.isArray(slot.allowedDurations)) {
            slot.allowedDurations.forEach((d: number) => durations.add(d))
          } else if (slot.durationMinutes) {
            durations.add(slot.durationMinutes)
          }
        })
        setAvailableDurations(Array.from(durations).sort((a, b) => a - b))
      } else {
        setAvailableDurations([])
      }
    } catch (error) {
      console.error('Error fetching available durations:', error)
      setAvailableDurations([])
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

  const getDescription = (minutes: number) => {
    if (minutes === 60) return 'مدة امتحان قياسية'
    if (minutes === 120) return 'مدة امتحان ممتدة'
    if (minutes === 90) return 'مدة امتحان متوسطة'
    if (minutes === 180) return 'مدة امتحان طويلة'
    return 'مدة امتحان مخصصة'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">اختر مدة الامتحان</h2>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800"
        >
          العودة لتغيير التاريخ ←
        </button>
      </div>
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-900 font-medium">
          المدد المتاحة لـ <strong className="text-blue-700">{format(new Date(date), 'MMMM d, yyyy')}</strong>
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">جاري تحميل المدد المتاحة...</div>
      ) : availableDurations.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            لا توجد مدد امتحان متاحة لهذا التاريخ.
          </div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            جرب تاريخًا مختلفًا
          </button>
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-6">
            اختر مدة موعد الامتحان. يتم عرض المدد التي تحتوي على فترات متاحة فقط.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDurations.map((durationMinutes) => (
              <button
                key={durationMinutes}
                onClick={() => onSelect(durationMinutes)}
                className="text-left p-6 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-teal-50 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(durationMinutes)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

