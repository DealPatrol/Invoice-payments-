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
- Automated due/overdue reminders with Resend and optional late fees
- Revenue, collection-rate, and receivables-aging reports
- E-invoice network integrations clearly labeled as roadmap
- Stripe subscriptions and customer portal for $12 / $29 / $59 plans
- Transparent pricing: **$12 / $29 / $59** — zero per-invoice platform fees

## Local dev

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

The example enables explicit **demo mode** (`DEMO_MODE=true`) for keyless previews. Set
`DEMO_MODE=false` in production; production data uses only Prisma over Supabase Postgres.

## Production setup

1. Create a Supabase project and copy its pooled Postgres URL to `DATABASE_URL`
2. Set `DEMO_MODE=false` and run `npx prisma migrate deploy`
3. Add every variable listed in `.env.local.example`
4. Create separate Stripe Products/recurring Prices for Starter, Growth, and Scale
5. Configure Stripe webhook → `/api/webhooks/stripe` for checkout, subscription, and payment-failure events
6. Verify a Resend sending domain and set `RESEND_FROM_EMAIL`

Never commit real credentials. Prefer a restricted Stripe key with only the permissions this
integration needs. Stripe Tax is not enabled automatically; configure registrations in Stripe
before enabling tax collection for recurring plans.

## Deploy

```bash
npm run build
```

Configured for Vercel via `vercel.json` (`framework: nextjs`).
