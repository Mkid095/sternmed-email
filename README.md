# Sternmed Email Platform

A professional email management platform deployed at `mail.sternmedafrika.com`.

## Features

- **Inbox Management**: View, read, and organize received emails
- **Sent Emails**: Track all sent emails with status indicators
- **Compose**: Create and send new emails
- **Settings**: Manage account and email alias settings
- **Email Threading**: Automatically groups related emails
- **Real-time Updates**: Live email updates via Supabase subscriptions

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v7
- **Authentication**: Firebase Auth
- **Database**: Supabase (PostgreSQL)
- **Email Processing**: Cloudflare Worker

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   Copy `.env.example` to `.env` and fill in:
   - Firebase credentials (from sternmed-new project)
   - Supabase credentials (shared with sternmed-new)

3. **Run development server:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3001`

4. **Build for production:**
   ```bash
   npm run build
   ```

## Deployment

This platform is deployed to Vercel on the `mail` subdomain:
- Production URL: https://mail.sternmedafrika.com
- Vercel Project: sternmed-email

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  mail.sternmedafrika.com                │
│                    (Email Platform)                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Firebase Auth          Supabase Database          │ │
│  │  (Email Users)           (Email Data)               │ │
│  └─────────────────────────────────────────────────────┘ │
│                          ↑                                │
│                          │                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │        Cloudflare Email Worker (Inbound)            │ │
│  │  Processes emails → Stores in Supabase             │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Authentication

Email users are created in the main sternmed admin at:
`Admin → Mails → Create Email Alias`

This creates:
- Firebase Auth user with `email_user` role
- Supabase user profile linked to email alias
- Initial password sent to recipient email

## Database Tables

- `email_aliases` - Email alias configurations
- `email_inbound` - Received emails
- `email_outbound` - Sent emails
- `email_templates` - Email templates (managed in main admin)
- `email_logs` - Email activity logs

## Integration with Main Platform

The email platform shares:
- Firebase Auth project
- Supabase database
- Cloudflare Email Worker

Main admin (`sternmedafrika.com`) handles:
- Creating/managing email aliases
- Managing email templates
- Viewing unassigned emails

Email platform (`mail.sternmedafrika.com`) handles:
- Email user login
- Inbox/Sent/Compose/Settings
- Day-to-day email operations
