'use client'

import { useState } from 'react'

interface ExamSlotFormProps {
  onSuccess: () => void
  onCancel: () => void
  initialData?: any
}

interface DateRange {
  id: string
  startDate: string
  endDate: string
}

interface TimeWindow {
  id: string
  startTime: string
  endTime: string
  allowedDurations: number[]
}

export default function ExamSlotForm({ onSuccess, onCancel, initialData }: ExamSlotFormProps) {
  const [dateRanges, setDateRanges] = useState<DateRange[]>(() => {
    if (initialData?.date) {
      return [{ id: '1', startDate: initialData.date, endDate: initialData.date }]
    }
    return [{ id: '1', startDate: '', endDate: '' }]
  })

  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>(() => {
    if (initialData?.startTime && initialData?.endTime) {
      try {
        const allowedDurations = initialData.allowedDurations 
          ? (typeof initialData.allowedDurations === 'string' 
              ? JSON.parse(initialData.allowedDurations) 
              : initialData.allowedDurations)
          : [60, 120]
        return [{ 
          id: '1', 
          startTime: initialData.startTime, 
          endTime: initialData.endTime,
          allowedDurations 
        }]
      } catch {
        return [{ id: '1', startTime: initialData.startTime, endTime: initialData.endTime, allowedDurations: [60, 120] }]
      }
    }
    return [{ id: '1', startTime: '09:00', endTime: '17:00', allowedDurations: [60, 120] }]
  })

  const [formData, setFormData] = useState({
    locationName: initialData?.locationName || '',
    rowStart: initialData?.rowStart || 1,
    rowEnd: initialData?.rowEnd || 20,
    defaultSeatsPerRow: initialData?.defaultSeatsPerRow || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  })

  const [dayExceptions, setDayExceptions] = useState<number[]>(() => {
    if (initialData?.dayExceptions) {
      try {
        return typeof initialData.dayExceptions === 'string' 
          ? JSON.parse(initialData.dayExceptions) 
          : initialData.dayExceptions
      } catch {
        return []
      }
    }
    return []
  })

  const [showDayExceptions, setShowDayExceptions] = useState<boolean>(() => {
    // Show if there are existing day exceptions, otherwise hidden by default
    if (initialData?.dayExceptions) {
      try {
        const exceptions = typeof initialData.dayExceptions === 'string' 
          ? JSON.parse(initialData.dayExceptions) 
          : initialData.dayExceptions
        return Array.isArray(exceptions) && exceptions.length > 0
      } catch {
        return false
      }
    }
    return false
  })

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  const commonDurations = [30, 60, 90, 120, 150, 180, 240]

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addDateRange = () => {
    setDateRanges([...dateRanges, { id: Date.now().toString(), startDate: '', endDate: '' }])
  }

  const removeDateRange = (id: string) => {
    if (dateRanges.length > 1) {
      setDateRanges(dateRanges.filter(range => range.id !== id))
    }
  }

  const updateDateRange = (id: string, field: 'startDate' | 'endDate', value: string) => {
    setDateRanges(dateRanges.map(range => 
      range.id === id ? { ...range, [field]: value } : range
    ))
  }

  const addTimeWindow = () => {
    setTimeWindows([...timeWindows, { 
      id: Date.now().toString(), 
      startTime: '09:00', 
      endTime: '17:00',
      allowedDurations: [60, 120]
    }])
  }

  const removeTimeWindow = (id: string) => {
    if (timeWindows.length > 1) {
      setTimeWindows(timeWindows.filter(window => window.id !== id))
    }
  }

  const updateTimeWindow = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setTimeWindows(timeWindows.map(window => {
      if (window.id === id) {
        const updatedWindow = { ...window, [field]: value }
        
        // Recalculate window duration and remove durations that no longer fit
        const [startHours, startMins] = updatedWindow.startTime.split(':').map(Number)
        const [endHours, endMins] = updatedWindow.endTime.split(':').map(Number)
        const windowDuration = (endHours * 60 + endMins) - (startHours * 60 + startMins)
        
        // Filter out durations that exceed the window
        const validDurations = updatedWindow.allowedDurations.filter(d => d <= windowDuration)
        
        return { ...updatedWindow, allowedDurations: validDurations }
      }
      return window
    }))
  }

  const toggleAllowedDuration = (windowId: string, duration: number) => {
    setTimeWindows(timeWindows.map(window => {
      if (window.id === windowId) {
        // Calculate window duration to check if duration fits
        const [startHours, startMins] = window.startTime.split(':').map(Number)
        const [endHours, endMins] = window.endTime.split(':').map(Number)
        const windowDuration = (endHours * 60 + endMins) - (startHours * 60 + startMins)
        
        // Only allow toggling if duration fits in window
        if (duration > windowDuration) {
          return window // Don't change if duration doesn't fit
        }
        
        const newDurations = window.allowedDurations.includes(duration)
          ? window.allowedDurations.filter(d => d !== duration)
          : [...window.allowedDurations, duration].sort((a, b) => a - b)
        return { ...window, allowedDurations: newDurations }
      }
      return window
    }))
  }

  const addCustomDuration = (windowId: string, duration: number) => {
    if (duration >= 15 && duration <= 480 && !isNaN(duration)) {
      setTimeWindows(timeWindows.map(window => {
        if (window.id === windowId && !window.allowedDurations.includes(duration)) {
          return { 
            ...window, 
            allowedDurations: [...window.allowedDurations, duration].sort((a, b) => a - b)
          }
        }
        return window
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate and normalize date ranges
      const normalizedRanges = dateRanges.map(range => {
        if (!range.startDate) {
          throw new Error('يجب أن يكون لكل نطاق تاريخ تاريخ بدء')
        }
        // If endDate is not provided, use startDate (single day)
        const endDate = range.endDate || range.startDate
        if (new Date(endDate) < new Date(range.startDate)) {
          throw new Error('تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ البدء')
        }
        return {
          startDate: range.startDate,
          endDate: endDate,
        }
      })

      // Validate time windows
      for (const window of timeWindows) {
        if (!window.startTime || !window.endTime) {
          throw new Error('يجب أن يكون لكل نافذة زمنية وقت بدء ووقت انتهاء')
        }
        // Validate that end time is after start time
        const [startHours, startMins] = window.startTime.split(':').map(Number)
        const [endHours, endMins] = window.endTime.split(':').map(Number)
        const startMinutes = startHours * 60 + startMins
        const endMinutes = endHours * 60 + endMins
        if (endMinutes <= startMinutes) {
          throw new Error('وقت الانتهاء يجب أن يكون بعد وقت البدء')
        }
        if (window.allowedDurations.length === 0) {
          throw new Error('يجب السماح بمدة واحدة على الأقل لكل نافذة زمنية')
        }
        // Validate that all allowed durations fit within the time window
        const windowDuration = endMinutes - startMinutes
        const maxAllowedDuration = Math.max(...window.allowedDurations)
        if (maxAllowedDuration > windowDuration) {
          throw new Error(`المدة المسموحة ${maxAllowedDuration} دقيقة تتجاوز مدة النافذة الزمنية ${windowDuration} دقيقة`)
        }
      }

      // For edit mode, use the PATCH API
      if (initialData) {
        const payload: any = {
          date: dateRanges[0].startDate,
          startTime: timeWindows[0].startTime,
          endTime: timeWindows[0].endTime,
          allowedDurations: timeWindows[0].allowedDurations,
          locationName: formData.locationName,
          rowStart: parseInt(formData.rowStart.toString()),
          rowEnd: parseInt(formData.rowEnd.toString()),
          isActive: formData.isActive,
        }
        
        if (formData.defaultSeatsPerRow) {
          payload.defaultSeatsPerRow = parseInt(formData.defaultSeatsPerRow.toString())
        }

        const response = await fetch(`/api/exam-slots/${initialData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await response.json()
        if (!response.ok) {
          // Show detailed error message if available
          const errorMessage = data.message || data.error || 'فشل تحديث فترة الامتحان'
          const errorDetails = data.details 
            ? (Array.isArray(data.details) 
                ? data.details.map((d: any) => `${d.path?.join('.') || ''}: ${d.message || ''}`).filter(Boolean).join(', ')
                : JSON.stringify(data.details))
            : ''
          throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage)
        }
        onSuccess()
        return
      }

      // For create mode, create multiple slots
      const payload = {
        dateRanges: normalizedRanges,
        timeWindows: timeWindows.map(window => ({
          startTime: window.startTime,
          endTime: window.endTime,
          allowedDurations: window.allowedDurations,
        })),
        locationName: formData.locationName,
        rowStart: parseInt(formData.rowStart.toString()),
        rowEnd: parseInt(formData.rowEnd.toString()),
        defaultSeatsPerRow: formData.defaultSeatsPerRow ? parseInt(formData.defaultSeatsPerRow.toString()) : null,
        isActive: formData.isActive,
        dayExceptions: dayExceptions.length > 0 ? dayExceptions : undefined,
      }

      const response = await fetch('/api/exam-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show detailed error message if available
        const errorMessage = data.message || data.error || 'فشل إنشاء فترات الامتحان'
        const errorDetails = data.details 
          ? (Array.isArray(data.details) 
              ? data.details.map((d: any) => `${d.path?.join('.') || ''}: ${d.message || ''}`).filter(Boolean).join(', ')
              : JSON.stringify(data.details))
          : ''
        throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage)
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {initialData ? 'تعديل فترة الامتحان' : 'إنشاء فترة امتحان'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Ranges Section */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              نطاقات التاريخ *
            </label>
            {!initialData && (
              <button
                type="button"
                onClick={addDateRange}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + إضافة نطاق تاريخ
              </button>
            )}
          </div>
          <div className="space-y-3">
            {dateRanges.map((range, index) => (
              <div key={range.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    تاريخ البدء {index + 1} *
                  </label>
                  <input
                    type="date"
                    value={range.startDate}
                    onChange={(e) => updateDateRange(range.id, 'startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    تاريخ الانتهاء {index + 1} *
                  </label>
                  <input
                    type="date"
                    value={range.endDate}
                    onChange={(e) => updateDateRange(range.id, 'endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min={range.startDate}
                  />
                </div>
                {!initialData && dateRanges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDateRange(range.id)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                  >
                    حذف
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            سيتم إنشاء فترات لكل يوم في كل نطاق تاريخ
          </p>
        </div>

        {/* Day Exceptions Section */}
        {!initialData && (
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                استثناءات الأيام (اختياري)
              </label>
              <button
                type="button"
                onClick={() => setShowDayExceptions(!showDayExceptions)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showDayExceptions ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    إخفاء
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    إظهار
                  </>
                )}
              </button>
            </div>
            
            {showDayExceptions && (
              <>
                <p className="text-xs text-gray-600 mb-3">
                  اختر أيام الأسبوع لاستبعادها من الحجوزات. على سبيل المثال، اختر الجمعة والسبت لمنع الحجوزات في عطلة نهاية الأسبوع.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dayNames.map((dayName, index) => {
                    const isSelected = dayExceptions.includes(index)
                    return (
                      <label
                        key={index}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-red-50 border-red-500 text-red-700'
                            : 'bg-white border-gray-300 hover:border-gray-400 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDayExceptions([...dayExceptions, index].sort())
                            } else {
                              setDayExceptions(dayExceptions.filter(d => d !== index))
                            }
                          }}
                          className="sr-only"
                        />
                        <span className="font-medium text-sm">{dayName}</span>
                      </label>
                    )
                  })}
                </div>
                {dayExceptions.length > 0 && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ لن يُسمح بالحجوزات في: {dayExceptions.map(d => dayNames[d]).join(', ')}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Time Windows Section */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              النوافذ الزمنية *
            </label>
            {!initialData && (
              <button
                type="button"
                onClick={addTimeWindow}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + إضافة نافذة زمنية
              </button>
            )}
          </div>
          <div className="space-y-6">
            {timeWindows.map((window, index) => {
              const [startHours, startMins] = window.startTime.split(':').map(Number)
              const [endHours, endMins] = window.endTime.split(':').map(Number)
              const startMinutes = startHours * 60 + startMins
              const endMinutes = endHours * 60 + endMins
              const windowDuration = endMinutes - startMinutes
              const windowDurationHours = Math.floor(windowDuration / 60)
              const windowDurationMins = windowDuration % 60
              const windowDurationText = windowDurationHours > 0 
                ? `${windowDurationHours}h ${windowDurationMins > 0 ? windowDurationMins + 'm' : ''}`.trim()
                : `${windowDurationMins}m`

              return (
                <div key={window.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">النافذة الزمنية {index + 1}</h4>
                    {!initialData && timeWindows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTimeWindow(window.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                      >
                        حذف النافذة
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        وقت البدء *
                      </label>
                      <input
                        type="time"
                        value={window.startTime}
                        onChange={(e) => updateTimeWindow(window.id, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        وقت الانتهاء *
                      </label>
                      <input
                        type="time"
                        value={window.endTime}
                        onChange={(e) => updateTimeWindow(window.id, 'endTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min={window.startTime}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        النافذة: {windowDurationText}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-2">
                      المدد المسموحة (يمكن للأطباء الاختيار منها) *
                    </label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {commonDurations.map((duration) => {
                          const isSelected = window.allowedDurations.includes(duration)
                          const durationText = duration === 60 ? 'ساعة واحدة' : duration === 120 ? 'ساعتان' : `${duration} دقيقة`
                          const fitsInWindow = duration <= windowDuration
                          
                          return (
                            <label
                              key={duration}
                              className={`px-3 py-2 rounded-md border-2 transition-colors ${
                                isSelected && fitsInWindow
                                  ? 'bg-blue-600 text-white border-blue-600 cursor-pointer'
                                  : fitsInWindow
                                  ? 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 cursor-pointer'
                                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected && fitsInWindow}
                                onChange={() => {
                                  if (fitsInWindow) {
                                    toggleAllowedDuration(window.id, duration)
                                  }
                                }}
                                disabled={!fitsInWindow}
                                className="sr-only"
                              />
                              {durationText}
                            </label>
                          )
                        })}
                      </div>
                      
                      {/* Custom duration input */}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="number"
                          placeholder="مخصص (15-480 دقيقة)"
                          min="15"
                          max="480"
                          step="15"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const input = e.target as HTMLInputElement
                              const duration = parseInt(input.value)
                              if (duration) {
                                addCustomDuration(window.id, duration)
                                input.value = ''
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            const duration = parseInt(input.value)
                            if (duration) {
                              addCustomDuration(window.id, duration)
                              input.value = ''
                            }
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                        >
                          إضافة
                        </button>
                      </div>
                      
                      {window.allowedDurations.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          المحدد: {window.allowedDurations.map(d => 
                            d === 60 ? '1س' : d === 120 ? '2س' : `${d}د`
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            سيتمكن الأطباء من حجز الامتحانات ضمن كل نافذة زمنية، مع الاختيار من المدد المسموحة التي تحددها.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم الموقع *
            </label>
            <input
              type="text"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="مثال: القاعة أ"
              required
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              بداية الصف *
            </label>
            <input
              type="number"
              value={formData.rowStart}
              onChange={(e) => setFormData({ ...formData, rowStart: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نهاية الصف *
            </label>
            <input
              type="number"
              value={formData.rowEnd}
              onChange={(e) => setFormData({ ...formData, rowEnd: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المقاعد الافتراضية لكل صف (اختياري)
            </label>
            <input
              type="number"
              value={formData.defaultSeatsPerRow}
              onChange={(e) => setFormData({ ...formData, defaultSeatsPerRow: e.target.value || '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              نشط
            </label>
          </div>
        </div>

        {/* Summary of slots to be created */}
        {!initialData && dateRanges.length > 0 && timeWindows.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">الملخص</h3>
            <p className="text-sm text-blue-800">
              سيتم إنشاء{' '}
              <strong>
                {dateRanges.reduce((total, range) => {
                  if (!range.startDate || !range.endDate) return total
                  const start = new Date(range.startDate)
                  const end = new Date(range.endDate)
                  let validDays = 0
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dayOfWeek = d.getDay()
                    if (!dayExceptions.includes(dayOfWeek)) {
                      validDays++
                    }
                  }
                  return total + validDays
                }, 0) * timeWindows.length}
              </strong>{' '}
              نافذة فترة امتحان:
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
              {dateRanges.map((range, idx) => {
                if (!range.startDate || !range.endDate) return null
                const start = new Date(range.startDate)
                const end = new Date(range.endDate)
                let validDays = 0
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  const dayOfWeek = d.getDay()
                  if (!dayExceptions.includes(dayOfWeek)) {
                    validDays++
                  }
                }
                return (
                  <li key={idx}>
                    نطاق التاريخ {idx + 1}: {validDays} يوم(أيام) صالحة × {timeWindows.length} نافذة(نوافذ) زمنية = {validDays * timeWindows.length} فترة
                    {dayExceptions.length > 0 && (
                      <span className="text-red-600 font-medium"> (استثناء {dayExceptions.map(d => dayNames[d]).join(', ')})</span>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700 font-semibold mb-1">النوافذ الزمنية:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                {timeWindows.map((tw, idx) => (
                  <li key={idx}>
                    {tw.startTime} - {tw.endTime}                     (المدد: {tw.allowedDurations.map(d => 
                      d === 60 ? '1س' : d === 120 ? '2س' : `${d}د`
                    ).join(', ')})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>جاري الحفظ...</span>
              </>
            ) : (
              initialData ? 'تحديث' : 'إنشاء'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}

