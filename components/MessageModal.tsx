'use client'

interface MessageModalProps {
  isOpen: boolean
  title: string
  message: string
  buttonText?: string
  onClose: () => void
  type?: 'success' | 'error' | 'info'
}

export default function MessageModal({
  isOpen,
  title,
  message,
  buttonText = 'حسناً',
  onClose,
  type = 'info',
}: MessageModalProps) {
  if (!isOpen) return null

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`text-3xl font-bold ${iconColors[type]}`}>
              {icons[type]}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-700 mb-6">{message}</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

