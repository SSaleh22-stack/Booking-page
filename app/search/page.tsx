'use client'

import { useState } from 'react'
import { useNotification } from '@/hooks/useNotification'
import { format } from 'date-fns'

export default function SearchBookingPage() {
  const [bookingReference, setBookingReference] = useState('')
  const [email, setEmail] = useState('')
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { showNotification, NotificationContainer } = useNotification()

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

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, mins] = startTime.split(':').map(Number)
    const startTotal = hours * 60 + mins
    const endTotal = startTotal + durationMinutes
    const endHours = Math.floor(endTotal / 60) % 24
    const endMins = endTotal % 60
    const timeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
    return formatTime(timeStr)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bookingReference.trim() || !email.trim()) {
      showNotification('يرجى إدخال مرجع الحجز والبريد الإلكتروني', 'error')
      return
    }

    setLoading(true)
    setBooking(null)

    try {
      const response = await fetch('/api/bookings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: bookingReference.trim(),
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل البحث عن الحجز')
      }

      if (data.booking) {
        setBooking(data.booking)
        showNotification('تم العثور على الحجز بنجاح', 'success')
      } else {
        showNotification('لم يتم العثور على الحجز', 'error')
      }
    } catch (error: any) {
      showNotification(error.message || 'حدث خطأ أثناء البحث', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 md:mb-12 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-3">
              البحث عن حجز
            </h1>
            <p className="text-lg text-gray-600">
              أدخل مرجع الحجز والبريد الإلكتروني للبحث عن حجزك
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 mb-6">
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label htmlFor="bookingReference" className="block text-sm font-semibold text-gray-700 mb-2">
                  مرجع الحجز *
                </label>
                <input
                  type="text"
                  id="bookingReference"
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-right text-lg"
                  placeholder="أدخل مرجع الحجز (12 حرف)"
                  maxLength={12}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-right"
                  placeholder="أدخل بريدك الإلكتروني"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-700 to-teal-600 text-white px-6 py-4 rounded-xl hover:from-blue-800 hover:to-teal-700 transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>جاري البحث...</span>
                  </>
                ) : (
                  'بحث'
                )}
              </button>
            </form>
          </div>

          {/* Booking Results */}
          {booking && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">تفاصيل الحجز</h2>
              
              {/* Status Badge */}
              <div className="mb-6">
                <span className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                  booking.status === 'CONFIRMED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {booking.status === 'CONFIRMED' ? '✓ مؤكد' : '✗ ملغي'}
                </span>
              </div>

              {/* Booking Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">مرجع الحجز</label>
                    <p className="text-lg font-bold text-gray-900 font-mono">{booking.bookingReference || 'غير متاح'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">التاريخ</label>
                    <p className="text-lg font-bold text-gray-900">
                      {format(new Date(booking.examSlot.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">الوقت</label>
                    <p className="text-lg font-bold text-gray-900">
                      {formatTime(booking.bookingStartTime || booking.examSlot.startTime)} - {calculateEndTime(
                        booking.bookingStartTime || booking.examSlot.startTime,
                        booking.bookingDurationMinutes || booking.examSlot.durationMinutes || 60
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">المدة</label>
                    <p className="text-lg font-bold text-gray-900">
                      {formatDuration(booking.bookingDurationMinutes || booking.examSlot.durationMinutes || 60)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">الموقع</label>
                    <p className="text-lg font-bold text-gray-900">{booking.examSlot.locationName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">الصفوف</label>
                    <p className="text-lg font-bold text-gray-900">
                      {(() => {
                        try {
                          const rows = JSON.parse(booking.selectedRows) as number[]
                          return Array.isArray(rows) ? rows.sort((a, b) => a - b).join(', ') : booking.selectedRows
                        } catch {
                          return booking.selectedRows
                        }
                      })()}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">معلومات الاتصال</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">الاسم</label>
                      <p className="font-semibold text-gray-900">{booking.firstName} {booking.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">البريد الإلكتروني</label>
                      <p className="font-semibold text-gray-900">{booking.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">الهاتف</label>
                      <p className="font-semibold text-gray-900">{booking.phone || 'غير متاح'}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {booking.status === 'CONFIRMED' && (
                  <div className="border-t pt-4 mt-4 flex flex-col sm:flex-row gap-3">
                    <a
                      href={`/manage/${booking.manageToken}`}
                      className="flex-1 bg-blue-700 text-white px-6 py-3 rounded-xl hover:bg-blue-800 transition-all font-semibold text-center"
                    >
                      إدارة الحجز
                    </a>
                    <a
                      href={`/api/bookings/${booking.id}/pdf`}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all font-semibold text-center"
                    >
                      تحميل PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <NotificationContainer />
    </div>
  )
}

