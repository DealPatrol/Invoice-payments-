'use client';

import { useState } from 'react';
import { COLORS } from '@/lib/constants';
import { ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const [billingError, setBillingError] = useState('');

  async function openBillingPortal() {
    setBillingError('');
    const response = await fetch('/api/billing/portal', { method: 'POST' });
    const data = await response.json();
    if (response.ok && data.url) window.location.href = data.url;
    else setBillingError(data.error || 'Billing portal unavailable');
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="w-full">
        <div className="p-8 max-w-2xl">
          <h1
            className="text-4xl font-black mb-8"
            style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
          >
            Settings
          </h1>

          <section
            className="rounded-lg border p-6 mb-6"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <h2 className="font-bold mb-4" style={{ color: COLORS.text }}>
              Environment (Vercel)
            </h2>
            <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
              Copy <code>.env.local.example</code> for the complete list. Set{' '}
              <code>DEMO_MODE=true</code> only for keyless demos.
            </p>
            <pre
              className="text-xs p-4 rounded-lg overflow-x-auto"
              style={{ background: COLORS.surfaceHigh, color: COLORS.text }}
            >
              {`DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=
STRIPE_SCALE_PRICE_ID=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=`}
            </pre>
          </section>

          <section
            className="rounded-lg border p-6 mb-6"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <h2 className="font-bold mb-4" style={{ color: COLORS.text }}>
              Database setup
            </h2>
            <p className="text-sm mb-3" style={{ color: COLORS.textMuted }}>
              Create a Supabase Postgres project, set its pooled{' '}
              <code className="text-xs">DATABASE_URL</code>, then run{' '}
              <code className="text-xs">npx prisma migrate deploy</code>.
            </p>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold"
              style={{ color: COLORS.accent }}
            >
              Open Supabase <ExternalLink size={14} />
            </a>
          </section>

          <section
            className="rounded-lg border p-6 mb-6"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <h2 className="font-bold mb-3" style={{ color: COLORS.text }}>Subscription</h2>
            <button
              type="button"
              onClick={openBillingPortal}
              className="px-4 py-2 rounded-lg font-bold text-sm"
              style={{ background: COLORS.accent, color: '#fff' }}
            >
              Manage billing
            </button>
            {billingError && <p className="mt-3 text-sm" style={{ color: COLORS.danger }}>{billingError}</p>}
          </section>

          <section
            className="rounded-lg border p-6"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <h2 className="font-bold mb-4" style={{ color: COLORS.text }}>
              Stripe webhooks
            </h2>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Point your webhook to{' '}
              <code className="text-xs">/api/webhooks/stripe</code> and listen for{' '}
              <code className="text-xs">checkout.session.completed</code>, subscription lifecycle,
              payment failure, and invoice failure events.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
