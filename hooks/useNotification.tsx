'use client'

import { useState, useCallback } from 'react'
import NotificationPopup from '@/components/NotificationPopup'

interface Notification {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now()
    setNotifications((prev) => [...prev, { id, message, type }])
    return id
  }, [])

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const NotificationContainer = () => (
    <>
      {notifications.map((notification) => (
        <NotificationPopup
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </>
  )

  return { showNotification, NotificationContainer }
}



