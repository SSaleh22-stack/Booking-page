# How to Connect Gmail to the Booking System

This guide will walk you through setting up Gmail SMTP to send booking confirmation emails.

## Step-by-Step Instructions

### Step 1: Enable 2-Step Verification on Your Google Account

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "How you sign in to Google", click **"2-Step Verification"**
3. Follow the prompts to enable 2-Step Verification
   - You'll need to verify your phone number
   - Google will send you a verification code

> **Important:** You MUST enable 2-Step Verification before you can create an App Password.

### Step 2: Generate an App Password

1. After enabling 2-Step Verification, go back to [Google Account Security](https://myaccount.google.com/security)
2. Look for **"App passwords"** (it should be visible under "2-Step Verification")
3. Click on **"App passwords"**
   - You might need to sign in again
4. In the "Select app" dropdown, choose **"Mail"**
5. In the "Select device" dropdown, choose **"Other (Custom name)"**
6. Type a name like **"Exam Room Booking System"** or **"Booking App"**
7. Click **"Generate"**
8. **COPY THE 16-CHARACTER PASSWORD** - You'll see something like: `abcd efgh ijkl mnop`
   - ⚠️ **This password will only be shown ONCE. Save it immediately!**
   - Remove the spaces when using it (e.g., `abcdefghijklmnop`)

### Step 3: Update Your .env File

1. Open or create a `.env` file in the root directory of your project
2. Add or update these variables:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=your-email@gmail.com

# Application URL (change this to your domain in production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Replace:**
- `your-email@gmail.com` with your actual Gmail address
- `abcdefghijklmnop` with the 16-character App Password you just generated (no spaces)

### Step 4: Restart Your Development Server

After updating the `.env` file:

1. Stop your current server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

> **Note:** Environment variables are only loaded when the server starts, so you MUST restart after changing `.env`.

### Step 5: Test the Connection

1. Go to your booking system: `http://localhost:3000/book`
2. Create a test booking
3. Check the email inbox of the email address you used in the booking form
4. You should receive a confirmation email from Gmail

---

## Troubleshooting

### ❌ Error: "Invalid login" or "Authentication failed"

**Solution:**
- Make sure you're using the **App Password**, not your regular Gmail password
- Verify the App Password is correct (no spaces, 16 characters)
- Check that `SMTP_USER` matches the Gmail address you used to create the App Password

### ❌ Error: "App passwords" option not showing

**Solution:**
- You MUST enable 2-Step Verification first
- Make sure you've completed the 2-Step Verification setup process
- Wait a few minutes and refresh the page

### ❌ Error: "Connection timeout" or "ECONNREFUSED"

**Solution:**
- Check your internet connection
- Verify firewall isn't blocking port 587
- Try port 465 instead (SSL):
  ```env
  SMTP_PORT=465
  ```
  And update `lib/email.ts` to use `secure: true` (see below)

### ❌ Emails going to spam

**Solution:**
- This is normal for automated emails
- Check the spam/junk folder
- Consider using a dedicated email service for production (SendGrid, AWS SES, etc.)

### ❌ "Less secure app access" error

**Solution:**
- Google no longer supports "Less secure app access"
- You MUST use App Passwords (follow Step 2 above)
- This is the recommended and secure way to connect

---

## Using Port 465 (SSL) Instead of 587 (TLS)

If port 587 doesn't work, you can use port 465 with SSL:

1. Update `.env`:
   ```env
   SMTP_PORT=465
   ```

2. Update `lib/email.ts` (add `secure: true`):

```typescript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // Use SSL for port 465
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
})
```

---

## Production Considerations

For production, consider:

1. **Gmail Limitations:**
   - Gmail has daily sending limits (~500 emails/day for free accounts)
   - Not recommended for high-volume production use

2. **Better Alternatives:**
   - **SendGrid** (free tier: 100 emails/day)
   - **AWS SES** (very affordable, scalable)
   - **Mailgun** (good for transactional emails)
   - **Postmark** (great deliverability)

3. **Domain Setup:**
   - Use your own domain email (e.g., `noreply@youruniversity.com`)
   - Set up SPF and DKIM records for better deliverability

---

## Quick Reference

| Setting | Value |
|---------|-------|
| **SMTP Host** | `smtp.gmail.com` |
| **SMTP Port** | `587` (TLS) or `465` (SSL) |
| **SMTP User** | Your Gmail address |
| **SMTP Pass** | 16-character App Password |
| **SMTP From** | Your Gmail address |

---

## Need Help?

1. Check the main [EMAIL_SETUP.md](./EMAIL_SETUP.md) for general email configuration
2. Verify your `.env` file is in the root directory
3. Check server console logs for detailed error messages
4. Make sure you've restarted the server after changing `.env`



