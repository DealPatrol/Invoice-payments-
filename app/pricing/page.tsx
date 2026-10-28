'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PRICING } from '@/lib/config';
import { ArrowRight, Bell, Check, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const tiers = [
  {
    key: 'starter' as const,
    highlight: false,
    features: [
      '50 invoices / month',
      '25 clients',
      'Stripe Checkout + pay portal',
      'Smart Pay Score™',
      'Multi-currency (Frankfurter rates)',
      'E-invoice standard labels (routing roadmap)',
      'Zero per-invoice platform fees',
    ],
  },
  {
    key: 'growth' as const,
    highlight: true,
    features: [
      '250 invoices / month',
      '100 clients',
      'Everything in Starter',
      'Smart reminder schedules',
      'Late-fee automation',
      'Recurring invoice templates',
      'Priority email support',
    ],
  },
  {
    key: 'scale' as const,
    highlight: false,
    features: [
      'Unlimited invoices & clients',
      'Everything in Growth',
      'Custom branding on pay portal',
      'Webhook + API access',
      'Dedicated onboarding',
      'Volume Stripe rate guidance',
    ],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function subscribe(plan: keyof typeof PRICING) {
    setLoading(plan);
    setError('');
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout unavailable');
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout unavailable');
      setLoading(null);
    }
  }

  const perks = [
    { icon: Zap, title: 'Get paid faster', body: 'Pay links, QR codes and a client portal on every invoice.' },
    { icon: Bell, title: 'Automatic reminders', body: 'Polite nudges and late fees run on a schedule you set.' },
    { icon: ShieldCheck, title: 'Zero platform fees', body: 'You only pay Stripe processing. We never take a cut.' },
  ];
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 80% at 50% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)' }} />
        <div className="relative mx-auto max-w-5xl px-5 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]"><Sparkles size={13} className="text-[var(--accent)]" />Invoicing for people who do the work</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">Send beautiful invoices. <span className="text-[var(--accent)]">Get paid in days</span>, not weeks.</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--text-muted)]">Estimates, invoices, reminders, time tracking and a client pay portal — cheaper than FreshBooks or QuickBooks.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/studio" className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition hover:brightness-110">Start free <ArrowRight size={16} /></Link>
            <a href="#plans" className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-high)]">See plans</a>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 text-left sm:grid-cols-3">
            {perks.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={18} /></span>
                <h3 className="mt-3 font-semibold text-[var(--text)]">{title}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{body}</p>
              </div>))}
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-5xl px-5 py-14">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Simple pricing</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Only Stripe processing (2.9% + 30¢) on payments. Cancel anytime.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {tiers.map(({ key, highlight, features }) => {
            const tier = PRICING[key];
            return (
              <div key={key} className={`relative flex flex-col rounded-[var(--radius-lg)] border bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] ${highlight ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] md:-translate-y-2' : 'border-[var(--border)]'}`}>
                {highlight && <span className="absolute -top-3 left-6 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--on-accent)]">Most popular</span>}
                <h3 className="text-lg font-semibold text-[var(--text)]">{tier.name}</h3>
                <p className="mt-3"><span className="tabular text-4xl font-semibold text-[var(--text)]">${tier.price}</span><span className="text-sm text-[var(--text-muted)]">/mo</span></p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {features.map((f) => <li key={f} className="flex gap-2 text-sm text-[var(--text-muted)]"><Check size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />{f}</li>)}
                </ul>
                <button type="button" onClick={() => subscribe(key)} disabled={loading !== null}
                  className={`mt-8 rounded-[var(--radius-md)] py-3 text-sm font-semibold transition disabled:opacity-60 ${highlight ? 'bg-[var(--accent)] text-[var(--on-accent)] hover:brightness-110' : 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-high)]'}`}>
                  {loading === key ? 'Opening checkout…' : `Choose ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>
        {error && <p role="alert" className="mt-6 text-center text-sm text-[var(--danger)]">{error}</p>}
        <div className="mt-14 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="font-semibold text-[var(--text)]">Why we&apos;re different</h3>
          <ul className="mt-3 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-2">
            {['Smart Pay Score™ included — no “insights” add-on', 'Client pay portal + QR on every plan', 'E-invoice standard labels today; network delivery on the roadmap', 'Open exchange rates (Frankfurter/ECB) built in'].map((t) => <li key={t} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />{t}</li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}
