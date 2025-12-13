'use client'

import { useState, useEffect } from 'react'
import ExamSlotForm from './ExamSlotForm'
import ExamSlotsTable from './ExamSlotsTable'
import BookingsTable from './BookingsTable'

interface AdminDashboardProps {
  onLogout?: () => void
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings'>('slots')
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchSlots = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/exam-slots?includeInactive=true')
      const data = await response.json()
      if (data.slots) {
        setSlots(data.slots)
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
  }, [])

  const handleSlotCreated = () => {
    setShowForm(false)
    fetchSlots()
  }

  const handleSlotUpdated = () => {
    fetchSlots()
  }

  const handleSlotDeleted = () => {
    fetchSlots()
    setRefreshKey(prev => prev + 1) // Refresh bookings when slot is deleted
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-blue-700 to-teal-600 rounded-xl p-6 mb-8 text-white shadow-lg">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">لوحة تحكم الإدارة</h1>
            <p className="text-blue-100">إدارة فترات الامتحانات والحجوزات</p>
          </div>
          <div className="flex gap-3 items-center">
            {activeTab === 'slots' && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-white text-blue-700 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-md"
              >
                {showForm ? 'إلغاء' : '+ إنشاء فترة جديدة'}
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                تسجيل الخروج
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-1 inline-flex border border-gray-200">
        <button
          onClick={() => {
            setActiveTab('slots')
            setShowForm(false)
          }}
          className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'slots'
              ? 'bg-blue-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          فترات الامتحانات
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'bookings'
              ? 'bg-blue-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          الحجوزات
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'slots' && (
        <>
          {showForm && (
            <div className="mb-8">
              <ExamSlotForm onSuccess={handleSlotCreated} onCancel={() => setShowForm(false)} />
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <ExamSlotsTable
              slots={slots}
              onUpdate={handleSlotUpdated}
              onDelete={handleSlotDeleted}
            />
          )}
        </>
      )}

      {activeTab === 'bookings' && (
        <BookingsTable refreshTrigger={refreshKey} />
      )}
    </div>
  )
}

