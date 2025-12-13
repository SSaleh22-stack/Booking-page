'use client'

import { useState } from 'react'
import AppointmentTypeSelection from '@/components/AppointmentTypeSelection'
import { useNotification } from '@/hooks/useNotification'
import BookingCalendar from '@/components/BookingCalendar'
import TimeSlotSelection from '@/components/TimeSlotSelection'
import TimeSelection from '@/components/TimeSelection'
import RowSelection from '@/components/RowSelection'
import DoctorDetailsForm from '@/components/DoctorDetailsForm'
import BookingReview from '@/components/BookingReview'

type BookingStep = 'date' | 'appointmentType' | 'time' | 'startTime' | 'rows' | 'details' | 'review'

export default function BookPage() {
  const [step, setStep] = useState<BookingStep>('date')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [selectedStartTime, setSelectedStartTime] = useState<string>('')
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [doctorDetails, setDoctorDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState(false)
  const { showNotification, NotificationContainer } = useNotification()

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setStep('appointmentType')
  }

  const handleAppointmentTypeSelect = (durationMinutes: number) => {
    setSelectedAppointmentType(durationMinutes)
    setStep('time')
  }

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot)
    setSelectedStartTime('')
    setSelectedRows([]) // Reset row selection
    // If slot has time window, go to time selection, otherwise go directly to rows
    if (slot.endTime) {
      setStep('startTime')
    } else {
      setStep('rows')
    }
  }

  const handleStartTimeSelect = (startTime: string) => {
    setSelectedStartTime(startTime)
    setStep('rows')
  }

  const handleRowsSelect = (rows: number[]) => {
    setSelectedRows(rows)
    setStep('details')
  }

  const handleDetailsSubmit = (details: typeof doctorDetails) => {
    setDoctorDetails(details)
    setStep('review')
  }

  const handleBookingConfirm = async () => {
    if (isBooking) return // Prevent multiple clicks
    
    try {
      setIsBooking(true)
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examSlotId: selectedSlot.id,
          bookingStartTime: selectedStartTime || selectedSlot.startTime,
          bookingDurationMinutes: selectedAppointmentType,
          selectedRows,
          ...doctorDetails,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء الحجز')
      }

      setBookingId(data.booking.id)
      // Redirect to success page
      window.location.href = `/book/success?id=${data.booking.id}`
    } catch (error: any) {
      showNotification(error.message || 'فشل إنشاء الحجز', 'error')
      setIsBooking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 md:mb-12 text-center px-4 pt-4 md:pt-6">
            <div className="inline-block mb-4 md:mb-6">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl transform rotate-3">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2 md:mb-3 text-center w-full break-words whitespace-normal px-2 leading-tight">
              احجز قاعة امتحان
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 font-medium text-center w-full break-words">جامعة القصيم</p>
          </div>

          {/* Progress indicator */}
          <div className="mb-6 md:mb-8 bg-white rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 shadow-xl border border-gray-100 backdrop-blur-sm overflow-x-auto">
            <div className="flex items-center justify-between gap-1 md:gap-2 min-w-max md:min-w-0">
              {['date', 'appointmentType', 'time', 'startTime', 'rows', 'details', 'review'].map((s, index) => {
                const stepNames = ['date', 'appointmentType', 'time', 'startTime', 'rows', 'details', 'review']
                const currentStepIndex = stepNames.indexOf(step)
                const isActive = step === s
                const isCompleted = currentStepIndex > index
                
                return (
                  <div key={s} className="flex items-center flex-shrink-0" style={{ minWidth: '60px' }}>
                    <div className="flex flex-col items-center w-full">
                      <div
                        className={`w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-xs md:text-sm lg:text-base transition-all ${
                          isActive
                            ? 'bg-gradient-to-br from-blue-600 to-teal-600 text-white shadow-lg ring-2 md:ring-4 ring-blue-200'
                            : isCompleted
                            ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`text-[10px] md:text-xs mt-1 md:mt-2 font-medium hidden sm:block ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {s === 'date' ? 'التاريخ' : s === 'appointmentType' ? 'النوع' : s === 'time' ? 'الفترة' : s === 'startTime' ? 'الوقت' : s === 'rows' ? 'الصفوف' : s === 'details' ? 'التفاصيل' : 'المراجعة'}
                      </span>
                    </div>
                    {index < 6 && (
                      <div
                        className={`flex-1 h-0.5 md:h-1 mx-1 md:mx-2 rounded-full transition-all ${
                          isCompleted
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : 'bg-gray-200'
                        }`}
                        style={{ minWidth: '20px' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10 border border-gray-100 backdrop-blur-sm">
            {step === 'date' && (
              <div>
                <BookingCalendar onDateSelect={handleDateSelect} />
              </div>
            )}
            {step === 'appointmentType' && selectedDate && (
              <AppointmentTypeSelection
                date={selectedDate}
                onSelect={handleAppointmentTypeSelect}
                onBack={() => setStep('date')}
              />
            )}
            {step === 'time' && selectedDate && selectedAppointmentType && (
              <TimeSlotSelection
                date={selectedDate}
                durationMinutes={selectedAppointmentType}
                onSlotSelect={handleSlotSelect}
                onBack={() => setStep('appointmentType')}
              />
            )}
            {step === 'startTime' && selectedSlot && selectedAppointmentType && (
              <TimeSelection
                slot={selectedSlot}
                durationMinutes={selectedAppointmentType}
                onTimeSelect={handleStartTimeSelect}
                onBack={() => setStep('time')}
              />
            )}
            {step === 'rows' && selectedSlot && (
              <RowSelection
                slot={selectedSlot}
                selectedStartTime={selectedStartTime || undefined}
                selectedDuration={selectedAppointmentType || undefined}
                onRowsSelect={handleRowsSelect}
                onBack={() => {
                  if (selectedSlot.endTime) {
                    setStep('startTime')
                  } else {
                    setStep('time')
                  }
                }}
              />
            )}
            {step === 'details' && (
              <DoctorDetailsForm
                onSubmit={handleDetailsSubmit}
                onBack={() => setStep('rows')}
              />
            )}
            {step === 'review' && selectedSlot && (
              <BookingReview
                slot={selectedSlot}
                selectedStartTime={selectedStartTime}
                selectedDuration={selectedAppointmentType || undefined}
                selectedRows={selectedRows}
                doctorDetails={doctorDetails}
                onConfirm={handleBookingConfirm}
                onBack={() => setStep('details')}
                isLoading={isBooking}
              />
            )}
          </div>
        </div>
        <NotificationContainer />
      </div>
    </div>
  )
}

