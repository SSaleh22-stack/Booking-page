'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function QULogo() {
  return (
    <Link 
      href="/" 
      className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-lg shadow-md hover:shadow-xl transition-all hover:scale-105 border-2 border-blue-300 touch-target"
    >
      <Image
        src="/logo.png"
        alt="جامعة القصيم"
        width={48}
        height={48}
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
        onError={(e) => {
          // Fallback to text if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.parentElement) {
            target.parentElement.innerHTML = '<span class="text-blue-900 font-bold text-lg sm:text-xl">QU</span>';
          }
        }}
      />
    </Link>
  )
}

