'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import ManageBookingView from './ManageBookingView'
import { useNotification } from '@/hooks/useNotification'

interface BookingsTableProps {
  refreshTrigger?: number
}

export default function BookingsTable({ refreshTrigger }: BookingsTableProps) {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [rescheduleBooking, setRescheduleBooking] = useState<any | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null)
  const [selectedStartTime, setSelectedStartTime] = useState<string>('')
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [manageBooking, setManageBooking] = useState<any | null>(null)
  const [manageBookingData, setManageBookingData] = useState<any | null>(null)
  const [manageBookingLoading, setManageBookingLoading] = useState(false)
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null)
  const { showNotification, NotificationContainer } = useNotification()

  const fetchBookings = async () => {
    try {
      setLoading(true)
      let url = '/api/bookings/admin?'
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      if (fromDate) params.append('fromDate', fromDate)
      if (toDate) params.append('toDate', toDate)
      url += params.toString()

      const response = await fetch(url)
      const data = await response.json()
      
      if (data.error) {
        console.error('Error:', data.error)
        setBookings([])
        return
      }
      
      if (data.bookings) {
        setBookings(data.bookings)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [filterStatus, fromDate, toDate, refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

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
    return `${minutes} دقيقة`
  }

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, mins] = startTime.split(':').map(Number)
    const startTotal = hours * 60 + mins
    const endTotal = startTotal + durationMinutes
    const endHours = Math.floor(endTotal / 60) % 24
    const endMins = endTotal % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
  }

  const handleCancel = async (bookingId: string) => {
    if (cancellingBookingId) return // Prevent multiple clicks
    
    if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
      return
    }

    try {
      setCancellingBookingId(bookingId)
      const response = await fetch(`/api/bookings/admin/${bookingId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      showNotification('تم إلغاء الحجز بنجاح', 'success')
      fetchBookings()
    } catch (error: any) {
      showNotification(error.message || 'فشل إلغاء الحجز', 'error')
    } finally {
      setCancellingBookingId(null)
    }
  }

  const handleRescheduleClick = (booking: any) => {
    setRescheduleBooking(booking)
    setRescheduleDate(booking.date)
    setSelectedSlot(null)
    setSelectedStartTime('')
    setSelectedRows([])
    setAvailableSlots([])
  }

  const fetchAvailableSlots = async () => {
    if (!rescheduleDate || !rescheduleBooking) return

    try {
      setRescheduleLoading(true)
      const response = await fetch(
        `/api/exam-slots/available?date=${rescheduleDate}&durationMinutes=${rescheduleBooking.durationMinutes}&excludeBookingId=${rescheduleBooking.id}`
      )
      const data = await response.json()

      if (data.error) {
        console.error('Error:', data.error)
        setAvailableSlots([])
        return
      }

      setAvailableSlots(data.slots || [])
    } catch (error) {
      console.error('Error fetching slots:', error)
      setAvailableSlots([])
    } finally {
      setRescheduleLoading(false)
    }
  }

  useEffect(() => {
    if (rescheduleDate && rescheduleBooking) {
      fetchAvailableSlots()
    }
  }, [rescheduleDate, rescheduleBooking?.durationMinutes]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot)
    setSelectedStartTime('')
    setSelectedRows([])

    // Auto-select first available time if slot has time window
    if (slot.endTime && slot.bookedTimeSlots) {
      const availableTimes = generateAvailableTimes(slot, rescheduleBooking.durationMinutes)
      if (availableTimes.length > 0) {
        const firstTime = availableTimes[0]
        handleTimeSelect(firstTime, slot)
      }
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
    // Always generate times at hourly intervals (every hour: 8:00, 9:00, 10:00, etc.)
    // The duration is used to check if the time + duration fits within the window
    const interval = 60 // Always use 1 hour interval

    // Generate all times that fit within the window
    while (currentMinutes + durationMinutes <= windowEndMinutes) {
      const hours = Math.floor(currentMinutes / 60) % 24
      const mins = currentMinutes % 60
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
      availableTimes.push(timeStr)
      currentMinutes += interval // Always increment by 1 hour
      
      // Safety check to prevent infinite loop
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

  const handleTimeSelect = (time: string, slot: any) => {
    setSelectedStartTime(time)
    
    // Auto-select first available rows
    if (slot && slot.bookedTimeSlots) {
      const bookedRows = new Set<number>()
      const [startHours, startMins] = time.split(':').map(Number)
      const bookingStartMinutes = startHours * 60 + startMins
      const bookingEndMinutes = bookingStartMinutes + rescheduleBooking.durationMinutes

      slot.bookedTimeSlots.forEach((bookedSlot: any) => {
        const [bookedStartHours, bookedStartMins] = bookedSlot.startTime.split(':').map(Number)
        const [bookedEndHours, bookedEndMins] = bookedSlot.endTime.split(':').map(Number)
        const bookedStartMinutes = bookedStartHours * 60 + bookedStartMins
        const bookedEndMinutes = bookedEndHours * 60 + bookedEndMins

        // Check if this booked slot matches the current booking's time
        const currentBookingStartTime = rescheduleBooking.bookingStartTime || rescheduleBooking.startTime
        const [currentStartHours, currentStartMins] = currentBookingStartTime.split(':').map(Number)
        const currentStartMinutes = currentStartHours * 60 + currentStartMins
        const currentEndMinutes = currentStartMinutes + rescheduleBooking.durationMinutes

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
              if (!rescheduleBooking.selectedRows.includes(row)) {
                bookedRows.add(row)
              }
            })
          }
        }
      })

      const totalRows = slot.rowEnd - slot.rowStart + 1
      const numRows = rescheduleBooking.selectedRows.length
      const availableRows: number[] = []
      
      // First, try to use the current booking's rows if they're still available
      const currentBookingRows = rescheduleBooking.selectedRows.filter((row: number) => 
        row >= slot.rowStart && row <= slot.rowEnd && !bookedRows.has(row)
      )
      
      // If we can use all current rows, use them
      if (currentBookingRows.length === numRows) {
        setSelectedRows(currentBookingRows)
      } else {
        // Otherwise, find available rows
        for (let i = slot.rowStart; i <= slot.rowEnd && availableRows.length < numRows; i++) {
          if (!bookedRows.has(i)) {
            availableRows.push(i)
          }
        }
        setSelectedRows(availableRows)
      }
    } else {
      // Legacy slot - just use the same number of rows
      const numRows = rescheduleBooking.selectedRows.length
      const rows: number[] = []
      for (let i = slot.rowStart; i < slot.rowStart + numRows && i <= slot.rowEnd; i++) {
        rows.push(i)
      }
      setSelectedRows(rows)
    }
  }

  const handleRescheduleSubmit = async () => {
    if (rescheduleLoading) return // Prevent multiple clicks
    
    if (!rescheduleBooking || !selectedSlot || !selectedStartTime || selectedRows.length === 0) {
      showNotification('يرجى اختيار تاريخ جديد وفترة ووقت وصفوف', 'error')
      return
    }

    try {
      setRescheduleLoading(true)
      const response = await fetch(`/api/bookings/admin/${rescheduleBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examSlotId: selectedSlot.id,
          bookingStartTime: selectedStartTime,
          bookingDurationMinutes: rescheduleBooking.durationMinutes,
          selectedRows,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule booking')
      }

      showNotification('تم إعادة جدولة الحجز بنجاح', 'success')
      setRescheduleBooking(null)
      fetchBookings()
    } catch (error: any) {
      showNotification(error.message || 'فشل إعادة جدولة الحجز', 'error')
    } finally {
      setRescheduleLoading(false)
    }
  }

  const handleManageClick = async (booking: any) => {
    try {
      setManageBookingLoading(true)
      setManageBooking(booking)
      
      const response = await fetch(`/api/bookings/manage/${booking.manageToken}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load booking')
      }
      
      setManageBookingData(data)
    } catch (error: any) {
      showNotification(error.message || 'Failed to load booking details', 'error')
      setManageBooking(null)
    } finally {
      setManageBookingLoading(false)
    }
  }

  const handleManageUpdate = async (updateData: any) => {
    if (!manageBooking || updatingBookingId) return
    
    try {
      setUpdatingBookingId(manageBooking.id)
      const response = await fetch(`/api/bookings/manage/${manageBooking.manageToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking')
      }

      // Refresh booking data
      await handleManageClick(manageBooking)
      fetchBookings()
      showNotification('تم تحديث الحجز بنجاح!', 'success')
    } catch (error: any) {
      showNotification(error.message || 'فشل تحديث الحجز', 'error')
    } finally {
      setUpdatingBookingId(null)
    }
  }

  const handleManageCancel = async () => {
    if (!manageBooking || cancellingBookingId) return
    
    if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
      return
    }

    try {
      setCancellingBookingId(manageBooking.id)
      const response = await fetch(`/api/bookings/manage/${manageBooking.manageToken}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      showNotification('تم إلغاء الحجز بنجاح', 'success')
      setManageBooking(null)
      setManageBookingData(null)
      fetchBookings()
    } catch (error: any) {
      showNotification(error.message || 'فشل إلغاء الحجز', 'error')
    } finally {
      setCancellingBookingId(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">الحالة</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">جميع الحالات</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="CANCELLED">ملغي</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStatus('')
                setFromDate('')
                setToDate('')
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm"
            >
              مسح المرشحات
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-8">جاري تحميل الحجوزات...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-900">لم يتم العثور على حجوزات.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  مرجع الحجز
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ والوقت
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المدة
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الموقع
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الصفوف (العدد)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الدكتور
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الاتصال
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رابط الإدارة
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => {
                const sortedRows = booking.selectedRows.sort((a: number, b: number) => a - b)
                const rowsDisplay = sortedRows.length > 5 
                  ? `${sortedRows[0]}-${sortedRows[sortedRows.length - 1]} (${sortedRows.length} rows)`
                  : sortedRows.join(', ') + ` (${sortedRows.length} row${sortedRows.length > 1 ? 's' : ''})`
                
                return (
                  <tr key={booking.id} className={booking.status === 'CANCELLED' ? 'opacity-60' : ''}>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-mono font-bold text-gray-900">
                        {booking.bookingReference || 'غير متاح'}
                      </div>
                      <div className="text-xs text-gray-900 mt-1">
                        الفترة: {booking.examSlotId?.substring(0, 12)}...
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(booking.date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-900">
                        {formatTime(booking.startTime)} - {formatTime(calculateEndTime(booking.startTime, booking.durationMinutes))}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatDuration(booking.durationMinutes)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {booking.locationName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      <div className="font-medium">{rowsDisplay}</div>
                      <div className="text-xs text-gray-900 mt-1">
                        النطاق: {booking.rowStart}-{booking.rowEnd}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.firstName} {booking.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        <a href={`mailto:${booking.email}`} className="text-blue-600 hover:underline">
                          {booking.email}
                        </a>
                      </div>
                      <div className="text-xs text-gray-900 mt-1">
                        <a href={`tel:${booking.phone}`} className="hover:underline">
                          {booking.phone}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {booking.status === 'CONFIRMED' ? 'مؤكد' : 'ملغي'}
                      </span>
                      <div className="text-xs text-gray-900 mt-1">
                        تم الإنشاء: {format(new Date(booking.createdAt), 'MMM d')}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleManageClick(booking)}
                        className="text-xs text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        عرض/تعديل
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      {booking.status === 'CONFIRMED' && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleRescheduleClick(booking)}
                            disabled={rescheduleLoading || cancellingBookingId === booking.id || updatingBookingId === booking.id}
                            className="text-xs text-blue-600 hover:text-blue-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {updatingBookingId === booking.id ? (
                              <>
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>جاري التحديث...</span>
                              </>
                            ) : (
                              'إعادة جدولة'
                            )}
                          </button>
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={cancellingBookingId === booking.id || rescheduleLoading}
                            className="text-xs text-red-600 hover:text-red-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {cancellingBookingId === booking.id ? (
                              <>
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>جاري الإلغاء...</span>
                              </>
                            ) : (
                              'إلغاء'
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">إعادة جدولة الحجز</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-900">
                <strong>الدكتور:</strong> {rescheduleBooking.firstName} {rescheduleBooking.lastName}
              </p>
              <p className="text-sm text-gray-900">
                <strong>الحالي:</strong> {format(new Date(rescheduleBooking.date), 'MMM d, yyyy')} في {formatTime(rescheduleBooking.startTime)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التاريخ الجديد
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {rescheduleDate && (
              <>
                {rescheduleLoading ? (
                  <div className="text-center py-4">جاري تحميل الفترات المتاحة...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-4 text-gray-900">
                    لا توجد فترات متاحة لهذا التاريخ والمدة.
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اختر الفترة الزمنية
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => handleSlotSelect(slot)}
                            className={`p-3 border-2 rounded-md text-left ${
                              selectedSlot?.id === slot.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="font-semibold">{slot.locationName}</div>
                            <div className="text-sm text-gray-900">
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime || slot.startTime)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedSlot && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          اختر وقت البدء
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {generateAvailableTimes(selectedSlot, rescheduleBooking.durationMinutes).map((time) => {
                            const [startHours, startMins] = time.split(':').map(Number)
                            const bookingStartMinutes = startHours * 60 + startMins
                            const bookingEndMinutes = bookingStartMinutes + rescheduleBooking.durationMinutes
                            
                            const bookedRows = new Set<number>()
                            
                            // For time window slots, check time-based conflicts
                            if (selectedSlot.endTime && selectedSlot.bookedTimeSlots) {
                              selectedSlot.bookedTimeSlots.forEach((bookedSlot: any) => {
                                const [bookedStartHours, bookedStartMins] = bookedSlot.startTime.split(':').map(Number)
                                const [bookedEndHours, bookedEndMins] = bookedSlot.endTime.split(':').map(Number)
                                const bookedStartMinutes = bookedStartHours * 60 + bookedStartMins
                                const bookedEndMinutes = bookedEndHours * 60 + bookedEndMins

                                // Check if this booked slot matches the current booking's time
                                const currentBookingStartTime = rescheduleBooking.bookingStartTime || rescheduleBooking.startTime
                                const [currentStartHours, currentStartMins] = currentBookingStartTime.split(':').map(Number)
                                const currentStartMinutes = currentStartHours * 60 + currentStartMins
                                const currentEndMinutes = currentStartMinutes + rescheduleBooking.durationMinutes

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
                                      if (!rescheduleBooking.selectedRows.includes(row)) {
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
                                if (!rescheduleBooking.selectedRows.includes(row)) {
                                  bookedRows.add(row)
                                }
                              })
                            }

                            const totalRows = selectedSlot.rowEnd - selectedSlot.rowStart + 1
                            const availableRowCount = totalRows - bookedRows.size
                            const isAvailable = availableRowCount >= rescheduleBooking.selectedRows.length

                            return (
                              <button
                                key={time}
                                onClick={() => handleTimeSelect(time, selectedSlot)}
                                disabled={!isAvailable}
                                className={`p-2 border-2 rounded-md text-sm ${
                                  selectedStartTime === time
                                    ? 'border-blue-500 bg-blue-50'
                                    : isAvailable
                                    ? 'border-gray-200 hover:border-blue-300'
                                    : 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                                }`}
                              >
                                {formatTime(time)}
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

                    {selectedStartTime && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الصفوف المحددة ({selectedRows.length} صفوف)
                        </label>
                        <div className="text-sm text-gray-900">
                          {selectedRows.sort((a, b) => a - b).join(', ')}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setRescheduleBooking(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={handleRescheduleSubmit}
                disabled={!selectedSlot || !selectedStartTime || selectedRows.length === 0 || rescheduleLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {rescheduleLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري إعادة الجدولة...
                  </>
                ) : (
                  'إعادة جدولة'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Booking Modal */}
      {manageBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">إدارة الحجز</h2>
              <button
                onClick={() => {
                  setManageBooking(null)
                  setManageBookingData(null)
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {manageBookingLoading ? (
              <div className="text-center py-8">جاري تحميل تفاصيل الحجز...</div>
            ) : manageBookingData ? (
              <div>
                {manageBookingData.booking && manageBookingData.slot && (
                  <ManageBookingView
                    booking={manageBookingData.booking}
                    slot={manageBookingData.slot}
                    onUpdate={handleManageUpdate}
                    onCancel={handleManageCancel}
                    isUpdating={updatingBookingId === manageBooking?.id}
                    isCancelling={cancellingBookingId === manageBooking?.id}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-red-500">فشل تحميل تفاصيل الحجز</div>
            )}
          </div>
        </div>
      )}

      <NotificationContainer />
    </div>
  )
}

