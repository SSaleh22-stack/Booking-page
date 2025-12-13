# Email Configuration Guide

This application sends automatic confirmation emails when bookings are created, updated, or cancelled. This guide explains how to configure email sending.

## Email Functions

The system automatically sends emails for:
1. **Booking Confirmation** - When a new booking is created
2. **Booking Update** - When a booking is rescheduled or updated
3. **Booking Cancellation** - When a booking is cancelled

## Configuration

### Step 1: Choose an Email Service Provider

You can use any SMTP-compatible email service. Popular options:

#### Option A: Gmail (for testing/development)
- **SMTP Host:** `smtp.gmail.com`
- **SMTP Port:** `587` (TLS) or `465` (SSL)
- **Authentication:** Your Gmail email and an App Password

#### Option B: Mailtrap (for testing - recommended for development)
- **SMTP Host:** `smtp.mailtrap.io`
- **SMTP Port:** `2525`
- **Authentication:** Get credentials from [mailtrap.io](https://mailtrap.io)

#### Option C: SendGrid
- **SMTP Host:** `smtp.sendgrid.net`
- **SMTP Port:** `587`
- **Authentication:** API key from SendGrid dashboard

#### Option D: AWS SES
- **SMTP Host:** `email-smtp.{region}.amazonaws.com`
- **SMTP Port:** `587`
- **Authentication:** AWS SMTP credentials

#### Option E: Other SMTP Services
- Outlook/Office 365
- Mailgun
- Postmark
- Any other SMTP service

### Step 2: Set Environment Variables

Create or update your `.env` file in the root directory with the following variables:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Application URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Gmail Setup (if using Gmail)

If you're using Gmail, you need to:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password:**
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password (not your regular Gmail password) in `SMTP_PASS`

### Step 4: Mailtrap Setup (for testing)

1. Sign up at [mailtrap.io](https://mailtrap.io) (free account available)
2. Go to your inbox settings
3. Copy the SMTP credentials:
   ```env
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your-mailtrap-username
   SMTP_PASS=your-mailtrap-password
   SMTP_FROM=test@example.com
   ```

### Step 5: Production Setup

For production, use a reliable email service:

#### SendGrid Example:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

#### AWS SES Example:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Testing Email Configuration

### Test Email Sending

1. Make sure your `.env` file is configured correctly
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Create a test booking through the booking form
4. Check your email inbox (or Mailtrap inbox if using Mailtrap)

### Verify Email is Working

The email system is already integrated and will automatically send emails when:
- A booking is created
- A booking is updated/rescheduled
- A booking is cancelled

If emails aren't being sent, check:
1. Server console logs for email errors
2. Your SMTP credentials are correct
3. Your email service allows SMTP connections
4. Firewall/network isn't blocking SMTP ports

## Email Templates

The email templates are defined in `lib/email.ts` and include:

1. **Confirmation Email:**
   - Booking details
   - Links to manage booking
   - Calendar (.ics) download link
   - PDF download link

2. **Update Email:**
   - Updated booking details
   - Same action links as confirmation

3. **Cancellation Email:**
   - Cancellation notice
   - Booking ID reference

## Troubleshooting

### Emails Not Sending

1. **Check Environment Variables:**
   ```bash
   # Make sure .env file exists and has correct values
   cat .env
   ```

2. **Check Server Logs:**
   - Look for "Error sending email" messages in console
   - Check for SMTP connection errors

3. **Test SMTP Connection:**
   - Verify SMTP credentials with your email provider
   - Check if port is blocked by firewall

4. **Gmail Specific:**
   - Make sure you're using App Password, not regular password
   - Check if "Less secure app access" is enabled (if not using App Password)

### Common Errors

- **"Invalid login"**: Check SMTP_USER and SMTP_PASS
- **"Connection timeout"**: Check SMTP_HOST and SMTP_PORT
- **"Authentication failed"**: Verify credentials with email provider

## Security Notes

1. **Never commit `.env` file** to version control
2. **Use App Passwords** instead of main passwords when possible
3. **Use environment-specific credentials** (different for dev/prod)
4. **Rate limiting**: Consider implementing rate limiting for production

## Current Implementation

The email system is already integrated in:
- `app/api/bookings/route.ts` - Sends confirmation on booking creation
- `app/api/bookings/manage/[token]/route.ts` - Sends update/cancellation emails
- `app/api/bookings/admin/[id]/route.ts` - Sends admin-triggered emails

All email sending is non-blocking (won't fail the request if email fails).



