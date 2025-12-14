'use client'

import { useState, useEffect } from 'react'

interface EmailType {
  id: string
  label: string
  description: string
}

export default function EmailSettings() {
  const [emailTypes] = useState<EmailType[]>([
    {
      id: 'confirmation',
      label: 'رسالة تأكيد عند إنشاء حجز جديد',
      description: 'يتم إرسالها تلقائياً عند إنشاء حجز جديد',
    },
    {
      id: 'update',
      label: 'رسالة تحديث عند تعديل الحجز',
      description: 'يتم إرسالها تلقائياً عند تعديل الحجز',
    },
    {
      id: 'cancellation',
      label: 'رسالة تأكيد إلغاء عند إلغاء الحجز',
      description: 'يتم إرسالها تلقائياً عند إلغاء الحجز',
    },
    {
      id: 'reminder',
      label: 'رسالة تذكير قبل يوم من الامتحان',
      description: 'يتم إرسالها تلقائياً قبل يوم من الامتحان',
    },
  ])

  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [emailSettings, setEmailSettings] = useState<{ smtpUser: string }>({ smtpUser: '' })

  useEffect(() => {
    // Load email settings to get SMTP_USER for default test email
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/email-settings')
        if (response.ok) {
          const data = await response.json()
          setEmailSettings({ smtpUser: data.smtpUser || '' })
          setTestEmail(data.smtpUser || '')
        }
      } catch (error) {
        console.error('Error loading email settings:', error)
      }
    }

    loadSettings()
  }, [])

  const handleSendTestEmail = async (emailType: string) => {
    if (!testEmail || !testEmail.includes('@')) {
      setMessage({ type: 'error', text: 'يرجى إدخال بريد إلكتروني صحيح' })
      return
    }

    setLoading(emailType)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType,
          email: testEmail,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'تم إرسال الرسالة بنجاح' })
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل إرسال الرسالة' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء إرسال الرسالة' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-right">إعدادات البريد الإلكتروني</h2>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg text-right ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Test Email Input */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
          البريد الإلكتروني لإرسال الرسائل التجريبية
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="example@email.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-right">
          سيتم إرسال جميع الرسائل التجريبية إلى هذا البريد
        </p>
      </div>

      {/* Email Types List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4 text-right">أنواع الرسائل المرسلة</h3>

        {emailTypes.map((emailType) => (
          <div
            key={emailType.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => handleSendTestEmail(emailType.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 text-right">
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={loading === emailType.id}
                    readOnly
                    className="w-5 h-5 text-blue-600 cursor-pointer"
                  />
                  <h4 className="text-lg font-semibold text-gray-900">{emailType.label}</h4>
                </div>
                <p className="text-sm text-gray-600 mr-8">{emailType.description}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSendTestEmail(emailType.id)
                }}
                disabled={loading === emailType.id || !testEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {loading === emailType.id ? 'جاري الإرسال...' : 'إرسال تجريبي'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-right">
        <p className="text-sm text-blue-800">
          <strong>ملاحظة:</strong> جميع الرسائل يتم إرسالها تلقائياً عند حدوث الإجراءات المذكورة.
          يمكنك استخدام الأزرار أعلاه لإرسال رسائل تجريبية للتحقق من عمل النظام.
        </p>
      </div>
    </div>
  )
}
