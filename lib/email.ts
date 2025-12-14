import nodemailer from 'nodemailer'

// Configure transporter based on port (465 = SSL, 587 = TLS)
const smtpPort = parseInt(process.env.SMTP_PORT || '2525')
const isSecure = smtpPort === 465

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: smtpPort,
  secure: isSecure, // Use SSL for port 465 (Gmail SSL), TLS for 587
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  // For Gmail and other services using TLS on port 587
  ...(smtpPort === 587 && {
    requireTLS: true,
  }),
})

// Helper function to get the correct app URL
function getAppUrl(): string {
  // Priority 1: NEXT_PUBLIC_APP_URL (explicitly set)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Priority 2: VERCEL_URL (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Priority 3: VERCEL_BRANCH_URL (for preview deployments)
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`
  }

  // Fallback: localhost for development
  return 'http://localhost:3000'
}

export interface BookingEmailData {
  bookingId: string // Still needed for API URLs
  bookingReference: string
  firstName: string
  lastName: string
  email: string
  date: string
  startTime: string
  durationMinutes: number
  locationName: string
  selectedRows: number[]
  manageToken: string
}

function formatDuration(minutes: number): string {
  if (minutes === 60) return 'ساعة واحدة'
  if (minutes === 120) return 'ساعتان'
  if (minutes === 90) return 'ساعة ونصف'
  if (minutes === 180) return '3 ساعات'
  if (minutes === 30) return '30 دقيقة'
  if (minutes === 150) return 'ساعتان ونصف'
  if (minutes === 240) return '4 ساعات'
  return `${minutes} دقيقة`
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const period = hour >= 12 ? 'م' : 'ص'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${period}`
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, mins] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, mins, 0, 0)
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
  const endHours = endDate.getHours()
  const endMins = endDate.getMinutes()
  const period = endHours >= 12 ? 'م' : 'ص'
  const displayHour = endHours % 12 || 12
  return `${displayHour}:${String(endMins).padStart(2, '0')} ${period}`
}

function formatDate(date: string): string {
  const d = new Date(date)
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  return `${days[d.getDay()]}، ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  const appUrl = getAppUrl()
  const manageUrl = `${appUrl}/manage/${data.manageToken}`
  const icsUrl = `${appUrl}/api/bookings/${data.bookingId}/ics`
  const pdfUrl = `${appUrl}/api/bookings/${data.bookingId}/pdf`

  const endTime = calculateEndTime(data.startTime, data.durationMinutes)

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        * { direction: rtl; text-align: right; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; direction: rtl; text-align: right; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 4px; direction: rtl; text-align: right; }
        .detail-row { margin: 10px 0; display: flex; justify-content: space-between; direction: rtl; }
        .label { font-weight: bold; color: #6b7280; text-align: right; }
        .value { color: #111827; font-weight: 500; text-align: right; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; direction: rtl; }
        .button:hover { background-color: #1d4ed8; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        p { text-align: right; direction: rtl; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>تم تأكيد حجز قاعة الامتحان</h1>
        </div>
        <div class="content">
          <p>عزيزي/عزيزتي ${data.firstName} ${data.lastName}،</p>
          <p>تم تأكيد حجز قاعة الامتحان الخاصة بك. فيما يلي التفاصيل:</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">مرجع الحجز:</span>
              <span class="value" style="font-family: monospace; font-size: 16px;">${data.bookingReference}</span>
            </div>
            <div class="detail-row">
              <span class="label">التاريخ:</span>
              <span class="value">${formatDate(data.date)}</span>
            </div>
            <div class="detail-row">
              <span class="label">الوقت:</span>
              <span class="value">${formatTime(data.startTime)} - ${endTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">المدة:</span>
              <span class="value">${formatDuration(data.durationMinutes)}</span>
            </div>
            <div class="detail-row">
              <span class="label">الموقع:</span>
              <span class="value">${data.locationName}</span>
            </div>
            <div class="detail-row">
              <span class="label">الصفوف:</span>
              <span class="value">${data.selectedRows.sort((a, b) => a - b).join(', ')}</span>
            </div>
          </div>

          <p style="margin-top: 20px; text-align: center;">
            <a href="${manageUrl}" class="button">إدارة الحجز</a>
          </p>

          <p style="margin-top: 20px; text-align: center;">
            <a href="${icsUrl}" class="button" style="background-color: #059669;">إضافة إلى التقويم</a>
            <a href="${pdfUrl}" class="button" style="background-color: #dc2626;">تحميل PDF</a>
          </p>

          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            يمكنك استخدام رابط "إدارة الحجز" أعلاه لإعادة جدولة أو إلغاء حجزك في أي وقت.
          </p>
        </div>
        <div class="footer">
          <p>هذه رسالة بريد إلكتروني آلية. يرجى عدم الرد.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
تم تأكيد حجز قاعة الامتحان

عزيزي/عزيزتي ${data.firstName} ${data.lastName}،

تم تأكيد حجز قاعة الامتحان الخاصة بك.

تفاصيل الحجز:
- مرجع الحجز: ${data.bookingReference}
- التاريخ: ${formatDate(data.date)}
- الوقت: ${formatTime(data.startTime)} - ${endTime}
- المدة: ${formatDuration(data.durationMinutes)}
- الموقع: ${data.locationName}
- الصفوف: ${data.selectedRows.sort((a, b) => a - b).join(', ')}

إدارة الحجز: ${manageUrl}
إضافة إلى التقويم: ${icsUrl}
تحميل PDF: ${pdfUrl}
  `

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@examroombooking.com',
      to: data.email,
      subject: 'تم تأكيد حجز قاعة الامتحان - جامعة القصيم',
      text,
      html,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export async function sendBookingUpdateEmail(data: BookingEmailData) {
  const appUrl = getAppUrl()
  const manageUrl = `${appUrl}/manage/${data.manageToken}`
  const icsUrl = `${appUrl}/api/bookings/${data.bookingId}/ics`
  const pdfUrl = `${appUrl}/api/bookings/${data.bookingId}/pdf`

  const endTime = calculateEndTime(data.startTime, data.durationMinutes)

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        * { direction: rtl; text-align: right; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; direction: rtl; text-align: right; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 4px; direction: rtl; text-align: right; }
        .detail-row { margin: 10px 0; display: flex; justify-content: space-between; direction: rtl; }
        .label { font-weight: bold; color: #6b7280; text-align: right; }
        .value { color: #111827; font-weight: 500; text-align: right; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; direction: rtl; }
        .button:hover { background-color: #1d4ed8; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        p { text-align: right; direction: rtl; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>تم تحديث الحجز</h1>
        </div>
        <div class="content">
          <p>عزيزي/عزيزتي ${data.firstName} ${data.lastName}،</p>
          <p>تم تحديث حجز قاعة الامتحان الخاصة بك. فيما يلي التفاصيل المحدثة:</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">مرجع الحجز:</span>
              <span class="value" style="font-family: monospace; font-size: 16px;">${data.bookingReference}</span>
            </div>
            <div class="detail-row">
              <span class="label">التاريخ:</span>
              <span class="value">${formatDate(data.date)}</span>
            </div>
            <div class="detail-row">
              <span class="label">الوقت:</span>
              <span class="value">${formatTime(data.startTime)} - ${endTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">المدة:</span>
              <span class="value">${formatDuration(data.durationMinutes)}</span>
            </div>
            <div class="detail-row">
              <span class="label">الموقع:</span>
              <span class="value">${data.locationName}</span>
            </div>
            <div class="detail-row">
              <span class="label">الصفوف:</span>
              <span class="value">${data.selectedRows.sort((a, b) => a - b).join(', ')}</span>
            </div>
          </div>

          <p style="margin-top: 20px; text-align: center;">
            <a href="${manageUrl}" class="button">إدارة الحجز</a>
          </p>

          <p style="margin-top: 20px; text-align: center;">
            <a href="${icsUrl}" class="button" style="background-color: #059669;">إضافة إلى التقويم</a>
            <a href="${pdfUrl}" class="button" style="background-color: #dc2626;">تحميل PDF</a>
          </p>
        </div>
        <div class="footer">
          <p>هذه رسالة بريد إلكتروني آلية. يرجى عدم الرد.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@examroombooking.com',
      to: data.email,
      subject: 'تم تحديث حجز قاعة الامتحان - جامعة القصيم',
      html,
    })
  } catch (error) {
    console.error('Error sending update email:', error)
    throw error
  }
}

export async function sendBookingCancellationEmail(data: BookingEmailData) {
  const appUrl = getAppUrl()
  const endTime = calculateEndTime(data.startTime, data.durationMinutes)

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        * { direction: rtl; text-align: right; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; direction: rtl; text-align: right; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 4px; direction: rtl; text-align: right; }
        .detail-row { margin: 10px 0; display: flex; justify-content: space-between; direction: rtl; }
        .label { font-weight: bold; color: #6b7280; text-align: right; }
        .value { color: #111827; font-weight: 500; text-align: right; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .reference { font-family: monospace; font-size: 16px; font-weight: bold; color: #111827; }
        p { text-align: right; direction: rtl; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; direction: rtl; }
        .button:hover { background-color: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>تم إلغاء الحجز</h1>
        </div>
        <div class="content">
          <p>عزيزي/عزيزتي ${data.firstName} ${data.lastName}،</p>
          <p>تم تأكيد إلغاء حجز قاعة الامتحان الخاص بك. فيما يلي تفاصيل الحجز الملغي:</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">مرجع الحجز:</span>
              <span class="value" style="font-family: monospace; font-size: 16px;">${data.bookingReference}</span>
            </div>
            <div class="detail-row">
              <span class="label">التاريخ:</span>
              <span class="value">${formatDate(data.date)}</span>
            </div>
            <div class="detail-row">
              <span class="label">الوقت:</span>
              <span class="value">${formatTime(data.startTime)} - ${endTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">المدة:</span>
              <span class="value">${formatDuration(data.durationMinutes)}</span>
            </div>
            <div class="detail-row">
              <span class="label">الموقع:</span>
              <span class="value">${data.locationName}</span>
            </div>
            <div class="detail-row">
              <span class="label">الصفوف:</span>
              <span class="value">${data.selectedRows.sort((a, b) => a - b).join(', ')}</span>
            </div>
          </div>

          <p style="margin-top: 20px;">إذا كنت بحاجة إلى حجز قاعة امتحان أخرى، يرجى زيارة صفحة الحجز.</p>
          
          <p style="margin-top: 20px; text-align: center;">
            <a href="${appUrl}/book" class="button">حجز قاعة جديدة</a>
          </p>
        </div>
        <div class="footer">
          <p>هذه رسالة بريد إلكتروني آلية. يرجى عدم الرد.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@examroombooking.com',
      to: data.email,
      subject: 'تم إلغاء حجز قاعة الامتحان - جامعة القصيم',
      html,
    })
  } catch (error) {
    console.error('Error sending cancellation email:', error)
    throw error
  }
}

export async function sendBookingReminderEmail(data: BookingEmailData) {
  const appUrl = getAppUrl()
  const manageUrl = `${appUrl}/manage/${data.manageToken}`
  const icsUrl = `${appUrl}/api/bookings/${data.bookingId}/ics`
  const pdfUrl = `${appUrl}/api/bookings/${data.bookingId}/pdf`

  const endTime = calculateEndTime(data.startTime, data.durationMinutes)

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        * { direction: rtl; text-align: right; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right; }
        .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; direction: rtl; text-align: right; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 4px; direction: rtl; text-align: right; }
        .detail-row { margin: 10px 0; display: flex; justify-content: space-between; direction: rtl; }
        .label { font-weight: bold; color: #6b7280; text-align: right; }
        .value { color: #111827; font-weight: 500; text-align: right; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; direction: rtl; }
        .button:hover { background-color: #1d4ed8; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        p { text-align: right; direction: rtl; }
        .reminder-box { background-color: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>تذكير: حجز قاعة الامتحان غداً</h1>
        </div>
        <div class="content">
          <p>عزيزي/عزيزتي ${data.firstName} ${data.lastName}،</p>
          
          <div class="reminder-box">
            <p style="font-weight: bold; margin: 0;">⏰ تذكير: حجزك سيكون غداً!</p>
          </div>

          <p>نود تذكيرك بحجز قاعة الامتحان الخاص بك. فيما يلي التفاصيل:</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">مرجع الحجز:</span>
              <span class="value" style="font-family: monospace; font-size: 16px;">${data.bookingReference}</span>
            </div>
            <div class="detail-row">
              <span class="label">التاريخ:</span>
              <span class="value">${formatDate(data.date)}</span>
            </div>
            <div class="detail-row">
              <span class="label">الوقت:</span>
              <span class="value">${formatTime(data.startTime)} - ${endTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">المدة:</span>
              <span class="value">${formatDuration(data.durationMinutes)}</span>
            </div>
            <div class="detail-row">
              <span class="label">الموقع:</span>
              <span class="value">${data.locationName}</span>
            </div>
            <div class="detail-row">
              <span class="label">الصفوف:</span>
              <span class="value">${data.selectedRows.sort((a, b) => a - b).join(', ')}</span>
            </div>
          </div>

          <p style="margin-top: 20px; text-align: center;">
            <a href="${manageUrl}" class="button">إدارة الحجز</a>
          </p>

          <p style="margin-top: 20px; text-align: center;">
            <a href="${icsUrl}" class="button" style="background-color: #059669;">إضافة إلى التقويم</a>
            <a href="${pdfUrl}" class="button" style="background-color: #dc2626;">تحميل PDF</a>
          </p>

          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            نتمنى لك التوفيق في الامتحان!
          </p>
        </div>
        <div class="footer">
          <p>هذه رسالة بريد إلكتروني آلية. يرجى عدم الرد.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@examroombooking.com',
      to: data.email,
      subject: 'تذكير: حجز قاعة الامتحان غداً - جامعة القصيم',
      html,
    })
  } catch (error) {
    console.error('Error sending reminder email:', error)
    throw error
  }
}

