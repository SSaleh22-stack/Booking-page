import Link from "next/link";

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
            نظام حجز قاعات الامتحانات
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            احجز صفوف قاعات الامتحانات لامتحانات جامعة القصيم.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center gap-2 bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-800 transition-all transform hover:scale-105 shadow-lg text-lg"
          >
            <CalendarIcon />
            <span>ابدأ الحجز الآن</span>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-700">
              <CalendarIcon />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">اختيار التاريخ بسهولة</h3>
            <p className="text-gray-600">
              تصفح التواريخ المتاحة في تقويم بديهي واختر الوقت المثالي لامتحانك.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4 text-teal-700">
              <MapPinIcon />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">اختر الموقع</h3>
            <p className="text-gray-600">
              اختر من بين مواقع قاعات الامتحانات المتعددة في حرم الجامعة.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-700">
              <UsersIcon />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">اختيار الصفوف</h3>
            <p className="text-gray-600">
              اختر صفوفًا محددة لحجز قاعة الامتحان مع توفر الوقت الفعلي.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl p-8 md:p-12 border border-blue-100">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-8 text-center">
            كيف يعمل النظام
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "اختر التاريخ", desc: "اختر من التواريخ المتاحة" },
              { step: "2", title: "اختر المدة", desc: "اختر مدة الامتحان" },
              { step: "3", title: "اختر الوقت والصفوف", desc: "حدد الفترة الزمنية والصفوف" },
              { step: "4", title: "تأكيد", desc: "أكمل حجزك" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-blue-700 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <Link
            href="/book"
            className="inline-block bg-gradient-to-r from-blue-700 to-teal-600 text-white px-10 py-4 rounded-xl font-semibold hover:from-blue-800 hover:to-teal-700 transition-all transform hover:scale-105 shadow-lg text-lg"
          >
            ابدأ الآن
          </Link>
        </div>
      </div>
    </div>
  );
}

