# Neon Database Setup Guide

This project uses **Neon** (serverless PostgreSQL) as the database. Follow these steps to set it up.

## Step 1: Create a Neon Account

1. Go to https://neon.tech
2. Sign up for a free account (no credit card required)
3. Neon offers a generous free tier perfect for development

## Step 2: Create a New Project

1. In the Neon console, click "Create Project"
2. Choose a project name (e.g., "exam-room-booking")
3. Select a region closest to you
4. Click "Create Project"

## Step 3: Get Your Connection String

1. After creating the project, Neon will show you a connection string
2. It will look like:
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require
   ```
3. **Important:** Make sure `?sslmode=require` is included at the end

## Step 4: Add Connection String to .env

1. Create a `.env` file in the project root (if it doesn't exist)
2. Add your Neon connection string:
   ```env
   DATABASE_URL="postgresql://username:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require"
   ```
3. Replace the connection string with your actual Neon connection string

## Step 5: Initialize the Database

Run these commands to set up your database schema:

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables (this will create a migration)
npx prisma migrate dev --name init

# Seed with sample data
npm run db:seed
```

## Step 6: Verify Connection

You can verify your connection is working by:

1. Running the app: `npm run dev`
2. Accessing the admin panel: http://localhost:3000/admin
3. Creating a test exam slot

## Troubleshooting

### Connection Errors

- **"Connection refused"**: Check that your connection string is correct
- **"SSL required"**: Make sure `?sslmode=require` is at the end of your connection string
- **"Authentication failed"**: Verify your username and password in the connection string

### Connection String Format

Your connection string should follow this format:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### Regenerating Connection String

If you need a new connection string:
1. Go to Neon console
2. Select your project
3. Go to "Connection Details"
4. Copy the connection string
5. Update your `.env` file

## Benefits of Neon

- **Serverless**: No database server management
- **Auto-scaling**: Handles traffic automatically
- **Free tier**: Generous free tier for development
- **Branching**: Create database branches for testing (Pro feature)
- **Fast**: Low latency connections

## Production

The same Neon database connection string works for both development and production. No need to change anything when deploying!



