'use client'

import { format } from 'date-fns'

interface BookingReviewProps {
  slot: any
  selectedStartTime?: string
  selectedDuration?: number
  selectedRows: number[]
  doctorDetails: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  onConfirm: () => void
  onBack: () => void
  isLoading?: boolean
}

export default function BookingReview({
  slot,
  selectedStartTime,
  selectedDuration,
  selectedRows,
  doctorDetails,
  onConfirm,
  onBack,
  isLoading = false,
}: BookingReviewProps) {
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

  // Calculate end time
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, mins] = startTime.split(':').map(Number)
    const startTotal = hours * 60 + mins
    const endTotal = startTotal + durationMinutes
    const endHours = Math.floor(endTotal / 60) % 24
    const endMins = endTotal % 60
    const timeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
    return formatTime(timeStr)
  }

  const displayStartTime = selectedStartTime || slot.startTime
  const displayDuration = selectedDuration || slot.durationMinutes || 60
  const displayEndTime = calculateEndTime(displayStartTime, displayDuration)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">مراجعة حجزك</h2>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800"
        >
          تعديل التفاصيل ←
        </button>
      </div>

      <div className="space-y-6">
        {/* Exam Details */}
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تفاصيل الامتحان
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-600 font-medium">التاريخ:</span>
              <span className="font-bold text-gray-900">{format(new Date(slot.date), 'MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-600 font-medium">الوقت:</span>
              <span className="font-bold text-gray-900">
                {formatTime(displayStartTime)} - {displayEndTime}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-600 font-medium">المدة:</span>
              <span className="font-bold text-gray-900">{formatDuration(displayDuration)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-600 font-medium">الموقع:</span>
              <span className="font-bold text-gray-900">{slot.locationName}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 font-medium">الصفوف:</span>
              <span className="font-bold text-gray-900">
                {selectedRows.sort((a, b) => a - b).join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Doctor Details */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            معلوماتك
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600 font-medium">الاسم:</span>
              <span className="font-bold text-gray-900">
                {doctorDetails.firstName} {doctorDetails.lastName}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600 font-medium">البريد الإلكتروني:</span>
              <span className="font-bold text-gray-900">{doctorDetails.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 font-medium">الهاتف:</span>
              <span className="font-bold text-gray-900">{doctorDetails.phone}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-blue-700 to-teal-600 text-white px-6 py-4 rounded-xl hover:from-blue-800 hover:to-teal-700 transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          {isLoading ? (
            <>
              <span>جاري المعالجة...</span>
              <svg className="animate-spin -mr-1 ml-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </>
          ) : (
            'تأكيد الحجز'
          )}
        </button>
        <button
          onClick={onBack}
          disabled={isLoading}
          className="bg-gray-200 text-gray-800 px-6 py-4 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          رجوع
        </button>
      </div>
    </div>
  )
}

