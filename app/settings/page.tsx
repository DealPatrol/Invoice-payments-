'use client';

import { Sidebar } from '@/components/Sidebar';
import { COLORS } from '@/lib/constants';
import { ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen" style={{ background: COLORS.background }}>
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen overflow-y-auto">
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
              Add these in your Vercel project → Settings → Environment Variables. The app runs in
              demo mode until Supabase is connected.
            </p>
            <pre
              className="text-xs p-4 rounded-lg overflow-x-auto"
              style={{ background: COLORS.surfaceHigh, color: COLORS.text }}
            >
              {`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
RESEND_API_KEY= (optional)`}
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
              Run <code className="text-xs">supabase/schema.sql</code> in the Supabase SQL editor
              (free tier).
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
            className="rounded-lg border p-6"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <h2 className="font-bold mb-4" style={{ color: COLORS.text }}>
              Stripe webhooks
            </h2>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Point your webhook to{' '}
              <code className="text-xs">/api/webhooks/stripe</code> and listen for{' '}
              <code className="text-xs">checkout.session.completed</code>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
