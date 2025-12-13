'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function Logo() {
  const [logoError, setLogoError] = useState(false)

  return (
    <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 flex-shrink-0">
      {!logoError ? (
        <div className="relative w-full h-full">
          <Image
            src="/logo.png"
            alt="شعار جامعة القصيم"
            width={192}
            height={192}
            className="object-contain drop-shadow-lg"
            priority
            onError={() => setLogoError(true)}
            unoptimized
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 rounded-xl shadow-lg border-2 border-blue-600">
          <div className="text-center px-2">
            <span className="text-white font-bold text-2xl sm:text-3xl md:text-4xl block">QU</span>
            <span className="text-blue-200 text-sm sm:text-base mt-1 block">جامعة القصيم</span>
          </div>
        </div>
      )}
    </div>
  )
}



