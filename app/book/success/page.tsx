'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('id')
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bookingId) {
      // Fetch booking details to get booking reference
      fetch(`/api/bookings/${bookingId}`)
        .then(res => res.json())
        .then(data => {
          if (data.booking) {
            setBooking(data.booking)
          }
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching booking:', err)
          setLoading(false)
        })
    }
  }, [bookingId])

  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center">جاري التحميل...</div>
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center border border-gray-100">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-blue-900 mb-3">
              تم تأكيد الحجز!
            </h1>
            <p className="text-lg text-gray-900">
              تم تأكيد حجز قاعة الامتحان الخاصة بك. ستصلك رسالة تأكيد بالبريد الإلكتروني قريبًا.
            </p>
          </div>

          {booking && booking.bookingReference && (
            <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-900 mb-2 font-medium">مرجع الحجز:</p>
              <p className="font-mono text-lg font-bold text-blue-900 break-all">{booking.bookingReference}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-stretch sm:items-center mb-6 sm:mb-8">
            {bookingId && (
              <>
                <a
                  href={`/api/bookings/${bookingId}/ics`}
                  className="bg-green-600 text-white px-4 sm:px-6 py-3 rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-semibold text-center flex items-center justify-center min-w-full sm:min-w-[160px] touch-target"
                >
                  📅 إضافة إلى التقويم
                </a>
                <a
                  href={`/api/bookings/${bookingId}/pdf`}
                  className="bg-red-600 text-white px-4 sm:px-6 py-3 rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-semibold text-center flex items-center justify-center min-w-full sm:min-w-[160px] touch-target"
                >
                  📄 تحميل PDF
                </a>
              </>
            )}
            <Link
              href="/"
              className="bg-blue-700 text-white px-4 sm:px-6 py-3 rounded-xl hover:bg-blue-800 transition-all shadow-md hover:shadow-lg font-semibold text-center flex items-center justify-center min-w-full sm:min-w-[160px] touch-target"
            >
              العودة للرئيسية
            </Link>
            <Link
              href="/book"
              className="bg-gray-200 text-gray-800 px-4 sm:px-6 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold text-center flex items-center justify-center min-w-full sm:min-w-[160px] touch-target"
            >
              احجز قاعة أخرى
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              تحقق من بريدك الإلكتروني للحصول على:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-900 max-w-md mx-auto">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                تأكيد الحجز
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                رابط إدارة الحجز
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                حدث التقويم (.ics)
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                ملخص PDF
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 text-center">Loading...</div>}>
      <BookingSuccessContent />
    </Suspense>
  )
}

