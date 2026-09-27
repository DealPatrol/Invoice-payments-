'use client';

import { useState } from 'react';
import { COLORS } from '@/lib/constants';
import { PRICING } from '@/lib/config';
import { Check } from 'lucide-react';

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
      'E-invoice network tags',
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
      window.location.href = data.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout unavailable');
      setLoading(null);
    }
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="w-full">
        <div className="p-8 max-w-5xl">
          <h1
            className="text-4xl font-black mb-2"
            style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
          >
            Simple pricing
          </h1>
          <p className="text-sm mb-2" style={{ color: COLORS.textMuted }}>
            Cheaper than FreshBooks or QuickBooks for solopreneurs — profitable at ~100 users on
            Growth ($29 × 100 = $2,900/mo revenue vs ~$50 infra).
          </p>
          <p className="text-xs mb-10" style={{ color: COLORS.success }}>
            You only pay Stripe processing (2.9% + 30¢). We never take a cut of invoice payments.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map(({ key, highlight, features }) => {
              const tier = PRICING[key];
              return (
                <div
                  key={key}
                  className="rounded-xl border p-6 flex flex-col"
                  style={{
                    background: highlight ? COLORS.surfaceHigh : COLORS.surface,
                    borderColor: highlight ? COLORS.accent : COLORS.border,
                    boxShadow: highlight ? `0 0 0 1px ${COLORS.accent}` : undefined,
                  }}
                >
                  {highlight && (
                    <span
                      className="text-xs font-bold uppercase mb-3 self-start px-2 py-1 rounded"
                      style={{ background: COLORS.accentGlow, color: COLORS.accent }}
                    >
                      Best for 100 users
                    </span>
                  )}
                  <h2 className="text-xl font-black" style={{ color: COLORS.text }}>
                    {tier.name}
                  </h2>
                  <p className="mt-2 mb-6">
                    <span className="text-4xl font-black" style={{ color: COLORS.accent }}>
                      ${tier.price}
                    </span>
                    <span className="text-sm" style={{ color: COLORS.textMuted }}>
                      /mo
                    </span>
                  </p>
                  <ul className="space-y-3 flex-1 mb-8">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex gap-2 text-sm"
                        style={{ color: COLORS.textMuted }}
                      >
                        <Check size={16} style={{ color: COLORS.success, flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => subscribe(key)}
                    disabled={loading !== null}
                    className="block text-center py-3 rounded-lg font-bold text-sm"
                    style={{
                      background: highlight ? COLORS.accent : 'transparent',
                      color: highlight ? '#fff' : COLORS.accent,
                      border: highlight ? 'none' : `1px solid ${COLORS.accent}`,
                    }}
                  >
                    {loading === key ? 'Opening checkout…' : 'Choose plan'}
                  </button>
                </div>
              );
            })}
          </div>
          {error && <p className="mt-6 text-sm" style={{ color: COLORS.danger }}>{error}</p>}

          <div
            className="mt-12 rounded-lg border p-6"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <h3 className="font-bold mb-2" style={{ color: COLORS.text }}>
              Why we&apos;re different
            </h3>
            <ul className="text-sm space-y-2" style={{ color: COLORS.textMuted }}>
              <li>· Smart Pay Score™ — competitors charge extra for “insights” add-ons</li>
              <li>· Client pay portal + QR — many tools lock this behind $50+ plans</li>
              <li>· 40+ e-invoice network routing labels — enterprise feature, included</li>
              <li>· Open exchange rates (Frankfurter/ECB) — no paid FX API required</li>
              <li>· Supabase + Stripe + Vercel — stack stays under ~$50/mo until you scale</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
