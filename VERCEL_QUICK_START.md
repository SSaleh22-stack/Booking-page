# Quick Start: Deploy to Vercel

## Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository: `SSaleh22-stack/Booking-page`
4. Vercel will auto-detect Next.js settings

## Step 2: Add Environment Variables

In **Project Settings** → **Environment Variables**, add:

```
DATABASE_URL=your-neon-connection-string
ADMIN_PASSWORD=your-secure-password
ADMIN_USERNAME=admin
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**Important:** After adding variables, you need to redeploy!

## Step 3: Deploy

Click "Deploy" - Vercel will:
1. Install dependencies
2. Run `prisma generate` (via postinstall script)
3. Run `prisma migrate deploy` (via build script)
4. Build Next.js app
5. Deploy to production

## Step 4: Access Admin Dashboard

After deployment:
- Go to: `https://your-project.vercel.app/admin`
- Username: `admin` (or your `ADMIN_USERNAME`)
- Password: Your `ADMIN_PASSWORD`

## Troubleshooting

- **Build fails?** Check that `DATABASE_URL` is correct
- **Admin login fails?** Verify `ADMIN_PASSWORD` is set
- **Email not working?** Check `SMTP_*` variables
- **PDF error?** Ensure font file is in `public/` folder

See `VERCEL_DEPLOY.md` for detailed instructions.




