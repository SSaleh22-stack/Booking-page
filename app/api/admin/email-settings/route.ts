import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/email-settings - Get email settings (read-only)
export async function GET() {
  return NextResponse.json({
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpUser: process.env.SMTP_USER || '',
    smtpFrom: process.env.SMTP_FROM || '',
  })
}

