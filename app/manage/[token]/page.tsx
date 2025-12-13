'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import ManageBookingView from '@/components/ManageBookingView'
import { useNotification } from '@/hooks/useNotification'

export default function ManageBookingPage() {
  const params = useParams()
  const token = params.token as string
  const [booking, setBooking] = useState<any>(null)
  const [slot, setSlot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showNotification, NotificationContainer } = useNotification()

  const fetchBooking = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/bookings/manage/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load booking')
      }

      setBooking(data.booking)
      setSlot(data.slot)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooking()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = async (updateData: any) => {
    try {
      const response = await fetch(`/api/bookings/manage/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking')
      }

      // Refresh booking data
      await fetchBooking()
      showNotification('Booking updated successfully!', 'success')
    } catch (err: any) {
      showNotification(err.message || 'Failed to update booking', 'error')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/manage/${token}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      showNotification('Booking cancelled successfully!', 'success')
      // Refresh to show cancelled status
      await fetchBooking()
    } catch (err: any) {
      showNotification(err.message || 'Failed to cancel booking', 'error')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div>Loading booking details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-900 mb-2">Error</h1>
          <p className="text-red-700">{error}</p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            ← Back to Home
          </a>
        </div>
      </div>
    )
  }

  if (!booking || !slot) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div>Booking not found</div>
      </div>
    )
  }

  return (
    <>
      <ManageBookingView
        booking={booking}
        slot={slot}
        onUpdate={handleUpdate}
        onCancel={handleCancel}
      />
      <NotificationContainer />
    </>
  )
}

