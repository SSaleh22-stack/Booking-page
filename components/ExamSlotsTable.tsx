'use client'

import { useState, useMemo, Fragment } from 'react'
import ExamSlotForm from './ExamSlotForm'
import ConfirmationModal from './ConfirmationModal'
import MessageModal from './MessageModal'

interface ExamSlotsTableProps {
  slots: any[]
  onUpdate: () => void
  onDelete: () => void
}

interface GroupedSlot {
  locationName: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  rowStart: number
  rowEnd: number
  slotIds: string[]
  totalSlots: number
  totalBookedRows: number
  totalRows: number
  isActive: boolean
}

export default function ExamSlotsTable({ slots, onUpdate, onDelete }: ExamSlotsTableProps) {
  const [editingSlot, setEditingSlot] = useState<any>(null)
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)
  const [togglingSlotId, setTogglingSlotId] = useState<string | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped')
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    type?: 'danger' | 'warning' | 'info'
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })
  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type?: 'success' | 'error' | 'info'
  }>({
    isOpen: false,
    title: '',
    message: '',
  })

  const formatDuration = (minutes: number) => {
    if (minutes === 60) return 'ساعة واحدة'
    if (minutes === 120) return 'ساعتان'
    return `${minutes} دقيقة`
  }

  // Group slots by location, time range, and date range
  const groupSlots = (): GroupedSlot[] => {
    const groups = new Map<string, GroupedSlot>()

    slots.forEach((slot) => {
      const key = `${slot.locationName}-${slot.startTime}-${slot.durationMinutes}-${slot.rowStart}-${slot.rowEnd}`
      
      if (!groups.has(key)) {
        groups.set(key, {
          locationName: slot.locationName,
          startDate: slot.date,
          endDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.startTime, // Will be updated if there are multiple times
          durationMinutes: slot.durationMinutes,
          rowStart: slot.rowStart,
          rowEnd: slot.rowEnd,
          slotIds: [slot.id],
          totalSlots: 1,
          totalBookedRows: slot.stats?.bookedRows || 0,
          totalRows: slot.stats?.totalRows || 0,
          isActive: slot.isActive,
        })
      } else {
        const group = groups.get(key)!
        const slotDate = new Date(slot.date)
        const groupStartDate = new Date(group.startDate)
        const groupEndDate = new Date(group.endDate)

        if (slotDate < groupStartDate) {
          group.startDate = slot.date
        }
        if (slotDate > groupEndDate) {
          group.endDate = slot.date
        }

        group.slotIds.push(slot.id)
        group.totalSlots++
        group.totalBookedRows += slot.stats?.bookedRows || 0
        group.totalRows += slot.stats?.totalRows || 0
      }
    })

    return Array.from(groups.values()).sort((a, b) => {
      const dateA = new Date(a.startDate)
      const dateB = new Date(b.startDate)
      return dateA.getTime() - dateB.getTime()
    })
  }

  // Calculate grouped slots (must be before conditional returns due to React hooks rules)
  const groupedSlots = useMemo(() => groupSlots(), [slots]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleActive = async (slot: any) => {
    if (togglingSlotId) return // Prevent multiple clicks
    try {
      setTogglingSlotId(slot.id)
      const response = await fetch(`/api/exam-slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !slot.isActive }),
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error toggling slot status:', error)
    } finally {
      setTogglingSlotId(null)
    }
  }

  const handleDelete = (id: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف فترة الامتحان هذه؟',
      type: 'danger',
      onConfirm: async () => {
        setConfirmationModal({ ...confirmationModal, isOpen: false })
        try {
          setDeletingSlotId(id)
          const response = await fetch(`/api/exam-slots/${id}`, {
            method: 'DELETE',
          })

          if (response.ok) {
            setMessageModal({
              isOpen: true,
              title: 'نجح',
              message: 'تم حذف الفترة بنجاح',
              type: 'success',
            })
            onDelete()
          } else {
            setMessageModal({
              isOpen: true,
              title: 'خطأ',
              message: 'فشل حذف الفترة',
              type: 'error',
            })
          }
        } catch (error) {
          console.error('Error deleting slot:', error)
          setMessageModal({
            isOpen: true,
            title: 'خطأ',
            message: 'فشل حذف الفترة',
            type: 'error',
          })
        } finally {
          setDeletingSlotId(null)
        }
      },
    })
  }

  // Multi-select handlers
  const toggleSelectSlot = (id: string) => {
    const newSelected = new Set(selectedSlots)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedSlots(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedSlots.size === slots.length) {
      setSelectedSlots(new Set())
    } else {
      setSelectedSlots(new Set(slots.map(slot => slot.id)))
    }
  }

  const clearSelection = () => {
    setSelectedSlots(new Set())
  }

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedSlots.size === 0) return
    
    const count = selectedSlots.size
    setConfirmationModal({
      isOpen: true,
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف ${count} فترة(فترات) امتحان؟`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmationModal({ ...confirmationModal, isOpen: false })
        try {
          setBulkActionLoading(true)
          const response = await fetch('/api/exam-slots/bulk', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedSlots) }),
          })

          const data = await response.json()
          if (response.ok) {
            setMessageModal({
              isOpen: true,
              title: 'نجح',
              message: `تم حذف ${data.deletedCount} فترة(فترات) بنجاح`,
              type: 'success',
            })
            clearSelection()
            onDelete()
          } else {
            setMessageModal({
              isOpen: true,
              title: 'خطأ',
              message: data.error || 'فشل حذف الفترات',
              type: 'error',
            })
          }
        } catch (error) {
          console.error('Error deleting slots:', error)
          setMessageModal({
            isOpen: true,
            title: 'خطأ',
            message: 'فشل حذف الفترات',
            type: 'error',
          })
        } finally {
          setBulkActionLoading(false)
        }
      },
    })
  }

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedSlots.size === 0) return

    try {
      setBulkActionLoading(true)
      const response = await fetch('/api/exam-slots/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(selectedSlots),
          isActive: activate 
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setMessageModal({
          isOpen: true,
          title: 'نجح',
          message: `تم ${activate ? 'تفعيل' : 'إلغاء تفعيل'} ${data.updatedCount} فترة(فترات) بنجاح`,
          type: 'success',
        })
        clearSelection()
        onUpdate()
      } else {
        setMessageModal({
          isOpen: true,
          title: 'خطأ',
          message: data.error || `فشل ${activate ? 'تفعيل' : 'إلغاء تفعيل'} الفترات`,
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error updating slots:', error)
      setMessageModal({
        isOpen: true,
        title: 'خطأ',
        message: `فشل ${activate ? 'تفعيل' : 'إلغاء تفعيل'} الفترات`,
        type: 'error',
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  if (editingSlot) {
    return (
      <div>
        <ExamSlotForm
          initialData={editingSlot}
          onSuccess={() => {
            setEditingSlot(null)
            onUpdate()
          }}
          onCancel={() => setEditingSlot(null)}
        />
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
        لم يتم العثور على فترات امتحان. قم بإنشاء أول فترة للبدء.
      </div>
    )
  }

  return (
    <Fragment>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* View Mode Toggle */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">العرض:</span>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'grouped'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            مجمعة
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            فردية
          </button>
        </div>
        <div className="text-sm text-gray-600">
          الإجمالي: {slots.length} فترة(فترات) | {groupedSlots.length} مجموعة(مجموعات)
        </div>
      </div>
      {/* Bulk Actions Bar */}
      {selectedSlots.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-blue-900 font-medium">
            {selectedSlots.size} فترة(فترات) محددة
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkActivate(true)}
              disabled={bulkActionLoading}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkActionLoading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>تفعيل المحدد</span>
            </button>
            <button
              onClick={() => handleBulkActivate(false)}
              disabled={bulkActionLoading}
              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkActionLoading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>إلغاء تفعيل المحدد</span>
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkActionLoading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>حذف المحدد</span>
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300"
            >
              مسح التحديد
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {viewMode === 'grouped' ? (
          <table className="min-w-full divide-y divide-gray-200" key="grouped-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={selectedSlots.size === slots.length && slots.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نطاق التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الوقت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المدة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الموقع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نطاق الصفوف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedSlots.map((group, index) => {
                const allSelected = group.slotIds.every(id => selectedSlots.has(id))
                const someSelected = group.slotIds.some(id => selectedSlots.has(id))
                
                return (
                  <tr 
                    key={`group-${index}`}
                    className={`${!group.isActive ? 'opacity-60' : ''} ${someSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected && !allSelected
                        }}
                        onChange={() => {
                          const newSelected = new Set(selectedSlots)
                          if (allSelected) {
                            group.slotIds.forEach(id => newSelected.delete(id))
                          } else {
                            group.slotIds.forEach(id => newSelected.add(id))
                          }
                          setSelectedSlots(newSelected)
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {group.startDate === group.endDate ? (
                        new Date(group.startDate).toLocaleDateString()
                      ) : (
                        <Fragment>
                          {new Date(group.startDate).toLocaleDateString()} - {new Date(group.endDate).toLocaleDateString()}
                          <br />
                          <span className="text-xs text-gray-500">({group.totalSlots} فترة)</span>
                        </Fragment>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {group.startTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatDuration(group.durationMinutes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {group.locationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {group.rowStart} - {group.rowEnd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          group.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {group.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 text-right">
                      <button
                        onClick={async () => {
                          if (confirm(`Delete all ${group.totalSlots} slots in this group?`)) {
                            const newSelected = new Set(group.slotIds)
                            setSelectedSlots(newSelected)
                            await handleBulkDelete()
                          }
                        }}
                        disabled={bulkActionLoading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {bulkActionLoading && (
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        <span>حذف المجموعة</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-gray-200" key="individual-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={selectedSlots.size === slots.length && slots.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الوقت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المدة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الموقع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نطاق الصفوف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slots.map((slot) => (
              <tr 
                key={slot.id} 
                className={`${!slot.isActive ? 'opacity-60' : ''} ${selectedSlots.has(slot.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <input
                    type="checkbox"
                    checked={selectedSlots.has(slot.id)}
                    onChange={() => toggleSelectSlot(slot.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {new Date(slot.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {slot.startTime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatDuration(slot.durationMinutes)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {slot.locationName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {slot.rowStart} - {slot.rowEnd}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      slot.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {slot.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 text-right">
                  <button
                    onClick={() => setEditingSlot(slot)}
                    disabled={togglingSlotId === slot.id || deletingSlotId === slot.id || bulkActionLoading}
                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleToggleActive(slot)}
                    disabled={togglingSlotId === slot.id || deletingSlotId === slot.id || bulkActionLoading}
                    className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {togglingSlotId === slot.id ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>جاري التحديث...</span>
                      </>
                    ) : (
                      slot.isActive ? 'إلغاء التفعيل' : 'تفعيل'
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    disabled={deletingSlotId === slot.id || togglingSlotId === slot.id || bulkActionLoading}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {deletingSlotId === slot.id ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>جاري الحذف...</span>
                      </>
                    ) : (
                      'حذف'
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
    <ConfirmationModal
      isOpen={confirmationModal.isOpen}
      title={confirmationModal.title}
      message={confirmationModal.message}
      onConfirm={confirmationModal.onConfirm}
      onCancel={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
      type={confirmationModal.type}
    />
    <MessageModal
      isOpen={messageModal.isOpen}
      title={messageModal.title}
      message={messageModal.message}
      onClose={() => setMessageModal({ ...messageModal, isOpen: false })}
      type={messageModal.type}
    />
    </Fragment>
  )
}

