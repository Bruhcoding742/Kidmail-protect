# KidMail Protector

An email filtering and monitoring system that protects children from inappropriate content in their inbox.

## Features

- Multi-provider email support (iCloud, Gmail, Outlook)
- Content filtering based on predefined and custom rules
- Automatic deletion of inappropriate messages
- Child account management
- Activity logging
- Trusted sender whitelist
- User-friendly web interface

## Deployment to Render

### Option 1: Deploy with Render Blueprint (Recommended)

1. Fork or push this repository to your GitHub account
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +"
4. Select "Blueprint"
5. Connect your GitHub repository
6. Render will detect the `render.yaml` file and set up the web service and database
7. Add required environment variables (see below)
8. Click "Apply"

### Option 2: Manual Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Create a new PostgreSQL database
   - Name: `kidmail-db`
   - Plan: Free or paid depending on your needs
3. Create a new Web Service
   - Connect your GitHub repository
   - Name: `kidmail-protector`
   - Runtime: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add environment variables (see below)

## Required Environment Variables

- `NODE_ENV`: Set to `production`
- `DATABASE_URL`: PostgreSQL connection string (provided by Render if using the Blueprint)
- `SESSION_SECRET`: Long random string for securing sessions

## Optional Environment Variables

- `SENDGRID_API_KEY`: For sending email notifications

## First-time Setup

After deployment:

1. Navigate to your Render-deployed URL
2. Create an administrator account
3. Add child accounts
4. Configure email providers
5. Set up filtering rules

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Database Management

```bash
# Push schema changes to database
npm run db:push
```