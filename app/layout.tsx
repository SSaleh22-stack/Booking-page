import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "حجز قاعات الامتحانات - جامعة القصيم",
  description: "احجز صفوف قاعات الامتحانات لامتحانات جامعة القصيم",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='14' fill='%232164A3' stroke='%2314406B' stroke-width='1.5'/%3E%3Crect x='9' y='11' width='14' height='12' rx='1.5' fill='white' stroke='%2314406B' stroke-width='1.2'/%3E%3Crect x='9' y='11' width='14' height='3.5' rx='1.5' fill='%2314406B'/%3E%3Ccircle cx='11.5' cy='12.5' r='0.8' fill='white'/%3E%3Ccircle cx='16' cy='12.5' r='0.8' fill='white'/%3E%3Ccircle cx='20.5' cy='12.5' r='0.8' fill='white'/%3E%3Cline x1='12' y1='16' x2='12' y2='21' stroke='%232164A3' stroke-width='1.2' stroke-linecap='round'/%3E%3Cline x1='16' y1='16' x2='16' y2='21' stroke='%232164A3' stroke-width='1.2' stroke-linecap='round'/%3E%3Cline x1='20' y1='16' x2='20' y2='21' stroke='%232164A3' stroke-width='1.2' stroke-linecap='round'/%3E%3Cline x1='9' y1='18.5' x2='23' y2='18.5' stroke='%232164A3' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='14' fill='%232164A3' stroke='%2314406B' stroke-width='1.5'/%3E%3Crect x='9' y='11' width='14' height='12' rx='1.5' fill='white' stroke='%2314406B' stroke-width='1.2'/%3E%3Crect x='9' y='11' width='14' height='3.5' rx='1.5' fill='%2314406B'/%3E%3Ccircle cx='11.5' cy='12.5' r='0.8' fill='white'/%3E%3Ccircle cx='16' cy='12.5' r='0.8' fill='white'/%3E%3Ccircle cx='20.5' cy='12.5' r='0.8' fill='white'/%3E%3Cline x1='12' y1='16' x2='12' y2='21' stroke='%232164A3' stroke-width='1.2' stroke-linecap='round'/%3E%3Cline x1='16' y1='16' x2='16' y2='21' stroke='%232164A3' stroke-width='1.2' stroke-linecap='round'/%3E%3Cline x1='20' y1='16' x2='20' y2='21' stroke='%232164A3' stroke-width='1.2' stroke-linecap='round'/%3E%3Cline x1='9' y1='18.5' x2='23' y2='18.5' stroke='%232164A3' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-gray-50">
        <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-lg sticky top-0 z-40 border-b-2 border-blue-700">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <nav className="flex items-center justify-between">
              {/* Right side - Logo and University Name */}
              <Link href="/" className="flex items-center gap-3 sm:gap-4 group">
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-lg shadow-md group-hover:shadow-xl transition-all group-hover:scale-105 border-2 border-blue-300 overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="جامعة القصيم"
                    width={56}
                    height={56}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-white font-bold text-base sm:text-lg md:text-xl leading-tight">
                    جامعة القصيم
                  </h1>
                  <p className="text-blue-200 text-xs sm:text-sm hidden sm:block">
                    نظام حجز قاعات الامتحانات
                  </p>
                </div>
              </Link>
              
              {/* Left side - Navigation */}
              <div className="flex items-center gap-3 sm:gap-4">
                <Link 
                  href="/book" 
                  className="bg-white text-blue-900 hover:bg-blue-50 font-bold transition-all text-sm sm:text-sm touch-target px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-xl border-2 border-blue-200 hover:border-blue-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <span className="text-base sm:text-lg">📅</span>
                  <span className="hidden sm:inline">احجز قاعة امتحان</span>
                  <span className="sm:hidden text-base">احجز</span>
                </Link>
                <Link 
                  href="/search" 
                  className="bg-blue-900 text-white hover:bg-blue-800 font-bold transition-all text-xs sm:text-sm touch-target px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-xl border-2 border-blue-800 hover:border-blue-700 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <span className="text-base sm:text-lg">🔍</span>
                  <span className="hidden sm:inline">البحث عن حجز</span>
                  <span className="sm:hidden">بحث</span>
                </Link>
              </div>
            </nav>
          </div>
        </header>
        <main className="min-h-screen pb-12">{children}</main>
        <footer className="bg-blue-900 text-white mt-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-bold text-lg mb-3">جامعة القصيم</h3>
                <p className="text-blue-200 text-sm">
                  نظام حجز قاعات الامتحانات لأعضاء هيئة التدريس.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3">روابط سريعة</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/" className="text-blue-200 hover:text-white transition-colors">
                      احجز قاعة امتحان
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3">اتصل بنا</h3>
                <p className="text-blue-200 text-sm">
                  للدعم، يرجى التواصل مع وكيل الكلية للشؤؤن التعليمية
                </p>
              </div>
            </div>
            <div className="border-t border-blue-800 mt-8 pt-6 text-center text-blue-200 text-sm">
              <p>&copy; 2026 جامعة القصيم. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

