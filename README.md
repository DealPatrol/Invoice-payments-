# InvoiceOS

Global invoice & payments platform — Smart Pay Score™, Stripe Checkout, client pay portal with QR, multi-currency (Frankfurter/ECB), and e-invoice network routing.

## Stack (low cost)

| Service | Role | Cost at ~100 users |
|---------|------|-------------------|
| **Vercel** | Hosting | Free–$20/mo |
| **Supabase** | Postgres DB | Free tier |
| **Stripe** | Payments | 2.9% + 30¢ (pass-through) |
| **Frankfurter** | FX rates | Free, no API key |
| **Resend** | Email reminders | Optional, free tier |

## Features

- Dashboard with collection rate & **Smart Pay Score™**
- Invoices CRUD with line items, tax, recurring & late-fee rules
- **Client pay portal** (`/pay/[token]`) with QR code
- **Stripe Checkout** one-click collection
- Smart reminder schedules (Resend-ready)
- E-invoice network labels (PEPPOL, ZUGFeRD, NF-e, etc.)
- Transparent pricing: **$12 / $29 / $59** — zero per-invoice platform fees

## Local dev

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Without env vars the app runs in **demo mode** (in-memory data) so builds and deploys succeed.

## Production setup

1. Run `supabase/schema.sql` in Supabase SQL editor
2. Add env vars in Vercel (see `.env.local.example`)
3. Configure Stripe webhook → `/api/webhooks/stripe`

## Deploy

```bash
npm run build
```

Configured for Vercel via `vercel.json` (`framework: nextjs`).
