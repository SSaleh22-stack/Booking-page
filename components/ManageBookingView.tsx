'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import BookingCalendar from './BookingCalendar'
import TimeSlotSelection from './TimeSlotSelection'
import RowSelection from './RowSelection'

interface ManageBookingViewProps {
  booking: any
  slot: any
  onUpdate: (data: any) => void
  onCancel: () => void
  isUpdating?: boolean
  isCancelling?: boolean
}

export default function ManageBookingView({
  booking,
  slot: initialSlot,
  onUpdate,
  onCancel,
  isUpdating = false,
  isCancelling = false,
}: ManageBookingViewProps) {
  const [editMode, setEditMode] = useState<'none' | 'date' | 'time' | 'timeSlot' | 'rows' | 'details'>('none')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [selectedStartTime, setSelectedStartTime] = useState<string>('')
  const [selectedRows, setSelectedRows] = useState<number[]>(booking.selectedRows || [])
  const [formData, setFormData] = useState({
    firstName: booking.firstName,
    lastName: booking.lastName,
    email: booking.email,
    phone: booking.phone,
  })

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

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, mins] = startTime.split(':').map(Number)
    const startTotal = hours * 60 + mins
    const endTotal = startTotal + durationMinutes
    const endHours = Math.floor(endTotal / 60) % 24
    const endMins = endTotal % 60
    const timeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
    return formatTime(timeStr)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setEditMode('time')
  }

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot)
    setSelectedStartTime('')
    setSelectedRows([])
    // If slot has endTime, show time selection, otherwise go directly to rows
    if (slot.endTime) {
      setEditMode('timeSlot')
    } else {
      setEditMode('rows')
    }
  }

  const generateAvailableTimes = (slot: any, durationMinutes: number) => {
    if (!slot.endTime) {
      return [slot.startTime]
    }

    const [startHours, startMins] = slot.startTime.split(':').map(Number)
    const [endHours, endMins] = slot.endTime.split(':').map(Number)
    const windowStartMinutes = startHours * 60 + startMins
    const windowEndMinutes = endHours * 60 + endMins

    const availableTimes: string[] = []
    let currentMinutes = windowStartMinutes
    const interval = 60 // Always use 1 hour interval

    while (currentMinutes + durationMinutes <= windowEndMinutes) {
      const hours = Math.floor(currentMinutes / 60) % 24
      const mins = currentMinutes % 60
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
      availableTimes.push(timeStr)
      currentMinutes += interval
      
      if (currentMinutes > windowEndMinutes) {
        break
      }
    }

    // Also include the start time if it wasn't already added and fits
    if (availableTimes.length === 0 || availableTimes[0] !== slot.startTime) {
      if (windowStartMinutes + durationMinutes <= windowEndMinutes) {
        availableTimes.unshift(slot.startTime)
      }
    }

    return availableTimes
  }

  const handleTimeSelect = (time: string) => {
    setSelectedStartTime(time)
    setEditMode('rows')
  }

  const handleRowsSelect = (rows: number[]) => {
    setSelectedRows(rows)
    // Save the update
    const updateData: any = {
      examSlotId: selectedSlot.id,
      selectedRows: rows,
    }
    if (selectedStartTime) {
      updateData.bookingStartTime = selectedStartTime
      updateData.bookingDurationMinutes = booking.bookingDurationMinutes || initialSlot.durationMinutes || 60
    }
    onUpdate(updateData)
    setEditMode('none')
    setSelectedDate(null)
    setSelectedSlot(null)
    setSelectedStartTime('')
  }

  const handleDetailsSubmit = () => {
    onUpdate(formData)
    setEditMode('none')
  }

  const currentSlot = selectedSlot || initialSlot

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">إدارة حجزك</h1>

        {booking.status === 'CANCELLED' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">تم إلغاء هذا الحجز.</p>
          </div>
        )}

        {/* Last Activity Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">آخر نشاط</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">تاريخ الإنشاء</label>
              <p className="text-lg font-semibold text-gray-900">
                {format(new Date(booking.createdAt), 'yyyy-MM-dd HH:mm')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">آخر تحديث</label>
              <p className="text-lg font-semibold text-gray-900">
                {format(new Date(booking.updatedAt), 'yyyy-MM-dd HH:mm')}
              </p>
            </div>
          </div>
        </div>

        {/* Current Booking Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">تفاصيل الحجز الحالي</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-600">التاريخ</label>
              <p className="text-lg font-semibold text-gray-900">
                {format(new Date(currentSlot.date), 'MMMM d, yyyy')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">الوقت</label>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(booking.bookingStartTime || currentSlot.startTime)} - {calculateEndTime(booking.bookingStartTime || currentSlot.startTime, booking.bookingDurationMinutes || currentSlot.durationMinutes || 60)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">المدة</label>
              <p className="text-lg font-semibold text-gray-900">{formatDuration(booking.bookingDurationMinutes || currentSlot.durationMinutes || 60)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">الموقع</label>
              <p className="text-lg font-semibold text-gray-900">{currentSlot.locationName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">الصفوف</label>
              <p className="text-lg font-semibold text-gray-900">
                {selectedRows.sort((a, b) => a - b).join(', ')}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600">مرجع الحجز</label>
              <p className="text-lg font-mono text-sm break-all text-gray-900">{booking.bookingReference || 'غير متاح'}</p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-gray-900 mb-2">معلومات الاتصال</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">الاسم</label>
                <p className="font-semibold text-gray-900">{formData.firstName} {formData.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">البريد الإلكتروني</label>
                <p className="font-semibold text-gray-900">{formData.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">الهاتف</label>
                <p className="font-semibold text-gray-900">{formData.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Options */}
        {booking.status !== 'CANCELLED' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">تعديل الحجز</h2>

            {editMode === 'none' && (
              <div className="space-y-4">
                <button
                  onClick={() => setEditMode('date')}
                  className="w-full text-right p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-semibold text-gray-900">تغيير التاريخ والوقت</div>
                  <div className="text-sm text-gray-900 mt-1">
                    اختر تاريخًا وفترة زمنية جديدة لامتحانك
                  </div>
                </button>

                <button
                  onClick={() => setEditMode('rows')}
                  className="w-full text-right p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-semibold text-gray-900">تغيير الصفوف</div>
                  <div className="text-sm text-gray-900 mt-1">
                    اختر صفوفًا مختلفة لامتحانك
                  </div>
                </button>

                <button
                  onClick={() => setEditMode('details')}
                  className="w-full text-right p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-semibold text-gray-900">تحديث معلومات الاتصال</div>
                  <div className="text-sm text-gray-900 mt-1">
                    غيّر اسمك أو بريدك الإلكتروني أو رقم هاتفك
                  </div>
                </button>
              </div>
            )}

            {editMode === 'date' && (
              <div>
                <BookingCalendar onDateSelect={handleDateSelect} />
                <button
                  onClick={() => {
                    setEditMode('none')
                    setSelectedDate(null)
                    setSelectedSlot(null)
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Cancel
                </button>
              </div>
            )}

            {editMode === 'time' && selectedDate && (
              <div>
                <TimeSlotSelection
                  date={selectedDate}
                  durationMinutes={booking.bookingDurationMinutes || initialSlot.durationMinutes || 60}
                  onSlotSelect={handleSlotSelect}
                  onBack={() => {
                    setEditMode('date')
                    setSelectedDate(null)
                  }}
                />
              </div>
            )}

            {editMode === 'timeSlot' && selectedSlot && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">اختر وقت البدء</h3>
                  <button
                    onClick={() => {
                      setEditMode('time')
                      setSelectedSlot(null)
                      setSelectedStartTime('')
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    رجوع ←
                  </button>
                </div>
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-900 font-medium">
                    الموقع: <strong className="text-blue-700">{selectedSlot.locationName}</strong>
                  </p>
                  <p className="text-sm text-blue-900 font-medium mt-1">
                    النافذة الزمنية: <strong className="text-blue-700">{formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}</strong>
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {generateAvailableTimes(selectedSlot, booking.bookingDurationMinutes || initialSlot.durationMinutes || 60).map((time) => {
                    const [startHours, startMins] = time.split(':').map(Number)
                    const bookingStartMinutes = startHours * 60 + startMins
                    const bookingEndMinutes = bookingStartMinutes + (booking.bookingDurationMinutes || initialSlot.durationMinutes || 60)
                    
                    const bookedRows = new Set<number>()
                    
                    // For time window slots, check time-based conflicts
                    if (selectedSlot.endTime && selectedSlot.bookedTimeSlots) {
                      selectedSlot.bookedTimeSlots.forEach((bookedSlot: any) => {
                        const [bookedStartHours, bookedStartMins] = bookedSlot.startTime.split(':').map(Number)
                        const [bookedEndHours, bookedEndMins] = bookedSlot.endTime.split(':').map(Number)
                        const bookedStartMinutes = bookedStartHours * 60 + bookedStartMins
                        const bookedEndMinutes = bookedEndHours * 60 + bookedEndMins

                        // Check if this booked slot matches the current booking's time
                        const currentBookingStartTime = booking.bookingStartTime || booking.startTime
                        const [currentStartHours, currentStartMins] = currentBookingStartTime.split(':').map(Number)
                        const currentStartMinutes = currentStartHours * 60 + currentStartMins
                        const currentEndMinutes = currentStartMinutes + (booking.bookingDurationMinutes || initialSlot.durationMinutes || 60)

                        // If times match exactly, exclude this entire booked slot (all rows are available)
                        const isSameTime = bookedStartMinutes === currentStartMinutes && bookedEndMinutes === currentEndMinutes

                        if (!(bookingEndMinutes <= bookedStartMinutes || bookingStartMinutes >= bookedEndMinutes)) {
                          // Times overlap
                          if (isSameTime) {
                            // Same time - exclude all rows from this slot (they're from current booking)
                            // Don't add any rows to bookedRows
                          } else {
                            // Different time - exclude current booking's rows only
                            bookedSlot.rows.forEach((row: number) => {
                              if (!booking.selectedRows.includes(row)) {
                                bookedRows.add(row)
                              }
                            })
                          }
                        }
                      })
                    } else {
                      // Legacy slot - check all booked rows (excluding current booking)
                      const allBookedRows = selectedSlot.stats?.bookedRowsList || []
                      allBookedRows.forEach((row: number) => {
                        if (!booking.selectedRows.includes(row)) {
                          bookedRows.add(row)
                        }
                      })
                    }

                    const totalRows = selectedSlot.rowEnd - selectedSlot.rowStart + 1
                    const availableRowCount = totalRows - bookedRows.size
                    const isAvailable = availableRowCount >= booking.selectedRows.length

                    return (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        disabled={!isAvailable}
                        className={`p-3 border-2 rounded-lg text-sm ${
                          selectedStartTime === time
                            ? 'border-blue-500 bg-blue-50'
                            : isAvailable
                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            : 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-semibold">{formatTime(time)}</div>
                        {isAvailable && (
                          <div className="text-xs text-green-600 mt-1">
                            {availableRowCount} صفوف
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {editMode === 'rows' && currentSlot && (
              <div>
                <RowSelection
                  slot={currentSlot}
                  selectedStartTime={selectedStartTime || booking.bookingStartTime || currentSlot.startTime}
                  selectedDuration={booking.bookingDurationMinutes || currentSlot.durationMinutes || 60}
                  currentBookingRows={selectedRows.length > 0 ? selectedRows : booking.selectedRows}
                  onRowsSelect={handleRowsSelect}
                  onBack={() => {
                    if (selectedSlot && selectedSlot.endTime) {
                      setEditMode('timeSlot')
                    } else {
                      setEditMode('time')
                    }
                  }}
                />
              </div>
            )}

            {editMode === 'details' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">تحديث معلومات الاتصال</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الاسم الأول
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        اسم العائلة
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الهاتف
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleDetailsSubmit}
                      disabled={isUpdating}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isUpdating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          جاري الحفظ...
                        </>
                      ) : (
                        'حفظ التغييرات'
                      )}
                    </button>
                    <button
                      onClick={() => setEditMode('none')}
                      disabled={isUpdating}
                      className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">الإجراءات</h2>
          <div className="flex flex-wrap gap-3 items-center">
            {booking.status !== 'CANCELLED' && (
              <button
                onClick={onCancel}
                disabled={isCancelling || isUpdating}
                className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px] font-semibold shadow-md hover:shadow-lg"
              >
                {isCancelling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري الإلغاء...
                  </>
                ) : (
                  'إلغاء الحجز'
                )}
              </button>
            )}
            <a
              href={`/api/bookings/${booking.id}/ics`}
              className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all text-center flex items-center justify-center min-w-[160px] font-semibold shadow-md hover:shadow-lg"
            >
              📅 إضافة إلى التقويم
            </a>
            <a
              href={`/api/bookings/${booking.id}/pdf`}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all text-center flex items-center justify-center min-w-[160px] font-semibold shadow-md hover:shadow-lg"
            >
              📄 تحميل PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

