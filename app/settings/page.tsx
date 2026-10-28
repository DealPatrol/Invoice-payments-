'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Database, ExternalLink, KeyRound, Webhook, Building2 } from 'lucide-react';
import { btnPrimary, btnGhost, Page, PageHeader } from '@/components/ui/kit';
import type { ComponentType, ReactNode } from 'react';

function Section({ icon: I, title, desc, children }: { icon: ComponentType<{ size?: number }>; title: string; desc: string; children: ReactNode }) {
  return (
    <section className="animate-in grid gap-4 border-b border-[var(--border)] py-6 last:border-0 md:grid-cols-[260px_1fr] md:gap-8">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]"><span className="text-[var(--accent)]"><I size={16} /></span>{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{desc}</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]">{children}</div>
    </section>
  );
}

const code = 'rounded bg-[var(--surface-high)] px-1.5 py-0.5 font-mono text-xs text-[var(--text)]';

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
    <Page narrow>
      <PageHeader title="Settings" subtitle="Your business profile, billing, and integrations." />
      <div>
        <Section icon={Building2} title="Business profile" desc="Name, logo, brand color, tax presets, and invoice template.">
          <p className="text-sm text-[var(--text-muted)]">Edit your profile in Invoice Studio. Changes apply to new invoices right away.</p>
          <Link href="/studio?tab=profile" className={`${btnGhost} mt-4`}>Open business profile</Link>
        </Section>
        <Section icon={CreditCard} title="Subscription" desc="Plan, payment method, and receipts through Stripe.">
          <button type="button" onClick={openBillingPortal} className={btnPrimary}>Manage billing</button>
          {billingError && <p className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{billingError}</p>}
        </Section>
        <Section icon={KeyRound} title="Environment" desc="Variables to set in Vercel. Full list in .env.local.example.">
          <p className="mb-3 text-sm text-[var(--text-muted)]">Set <code className={code}>DEMO_MODE=true</code> only for keyless demos.</p>
          <pre className="overflow-x-auto rounded-[10px] bg-[var(--ink)] p-4 font-mono text-xs leading-relaxed text-slate-200">{`DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=
STRIPE_SCALE_PRICE_ID=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=`}</pre>
        </Section>
        <Section icon={Database} title="Database" desc="Supabase Postgres for persistent data.">
          <p className="text-sm text-[var(--text-muted)]">Set the pooled <code className={code}>DATABASE_URL</code>, then run <code className={code}>npx prisma migrate deploy</code>.</p>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className={`${btnGhost} mt-4`}>Open Supabase <ExternalLink size={14} /></a>
        </Section>
        <Section icon={Webhook} title="Stripe webhooks" desc="Keeps payment status in sync automatically.">
          <p className="text-sm text-[var(--text-muted)]">Point your webhook to <code className={code}>/api/webhooks/stripe</code> and listen for <code className={code}>checkout.session.completed</code>, subscription lifecycle, payment failure, and invoice failure events.</p>
        </Section>
      </div>
    </Page>
  );
}
