# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

Create a `.env` file in the root directory:

```env
# Database - Neon PostgreSQL
# Get your connection string from: https://console.neon.tech
# Format: postgresql://user:password@host/database?sslmode=require
DATABASE_URL="postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require"

# Admin Password
ADMIN_PASSWORD="admin123"

# Email Configuration (use Mailtrap for testing)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-mailtrap-user"
SMTP_PASS="your-mailtrap-password"
SMTP_FROM="noreply@examroombooking.com"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Step 3: Set Up Neon Database

1. **Create a Neon account** (if you don't have one):
   - Go to https://neon.tech
   - Sign up for a free account

2. **Create a new project**:
   - In Neon console, create a new project
   - Copy the connection string (it will look like: `postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require`)
   - Paste it into your `.env` file as `DATABASE_URL`

3. **Set up the database schema**:
```bash
# Generate Prisma Client
npx prisma generate

# Create database tables (migrate)
npx prisma migrate dev --name init

# Seed with sample data
npm run db:seed
```

## Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Access Admin Panel

1. Navigate to http://localhost:3000/admin
2. Enter password: `admin123` (or your configured password)
3. Create exam slots

## Step 6: Test Booking Flow

1. Go to http://localhost:3000/book
2. Follow the booking steps
3. Check your email (Mailtrap inbox) for confirmation

## Troubleshooting

### Database Issues
- Verify your Neon connection string is correct in `.env`
- Make sure `sslmode=require` is included in the connection string
- Check Neon console to ensure your database is active
- If connection fails, try regenerating the connection string in Neon console

### Email Not Sending
- Verify SMTP credentials in `.env`
- Check Mailtrap inbox (if using Mailtrap)
- Check console for email errors (emails won't block booking creation)

### Port Already in Use
- Change port: `npm run dev -- -p 3001`

## Production Deployment

1. Your Neon database connection string works for both development and production
2. Configure production SMTP settings in `.env`
3. Set `NEXT_PUBLIC_APP_URL` to your domain
4. Run migrations: `npx prisma migrate deploy`
5. Build: `npm run build`
6. Start: `npm start`

