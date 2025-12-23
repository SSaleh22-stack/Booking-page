import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminCredentials } from '@/lib/auth'
import nodemailer from 'nodemailer'

// POST /api/admin/test-email - Send a test email
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 })
    }

    // Configure transporter
    const smtpPort = parseInt(process.env.SMTP_PORT || '2525')
    const isSecure = smtpPort === 465

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      ...(smtpPort === 587 && {
        requireTLS: true,
      }),
    })

    // Send test email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@examroombooking.com',
      to: email,
      subject: 'رسالة تجريبية - نظام حجز قاعات الامتحانات',
      html: `
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
            p { text-align: right; direction: rtl; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>رسالة تجريبية</h1>
            </div>
            <div class="content">
              <p>هذه رسالة تجريبية من نظام حجز قاعات الامتحانات.</p>
              <p>إذا تلقيت هذه الرسالة، فهذا يعني أن إعدادات البريد الإلكتروني تعمل بشكل صحيح.</p>
              <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                جامعة القصيم - نظام حجز قاعات الامتحانات
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ message: 'تم إرسال الرسالة التجريبية بنجاح' })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'فشل إرسال الرسالة التجريبية: ' + (error instanceof Error ? error.message : 'خطأ غير معروف') },
      { status: 500 }
    )
  }
}




