'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PRO_FEATURES, type ProFeature } from '@/lib/lab-plan';

export interface ClientPlan {
  plan: 'free' | 'solo' | 'pro';
  onTrial: boolean;
  mode?: 'demo' | 'postgres';
  upgrade?: { solo: string; pro: string };
}

let cached: Promise<ClientPlan | null> | null = null;

function loadPlan(): Promise<ClientPlan | null> {
  if (!cached) {
    cached = fetch('/api/plan')
      .then((r) => {
        if (r.status === 401) return { plan: 'free', onTrial: false } as ClientPlan; // signed out: Free features only
        return r.ok ? (r.json() as Promise<ClientPlan>) : null;
      })
      .catch(() => null);
  }
  return cached;
}

/**
 * The signed-in shop's plan. `pro` is true for Pro and the 14-day Pro trial.
 * While loading (or if the plan can't be read) features stay visible; the server still enforces the gate.
 */
export function usePlan(): { plan: ClientPlan | null; loaded: boolean; pro: boolean } {
  const [plan, setPlan] = useState<ClientPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    void loadPlan().then((value) => { if (live) { setPlan(value); setLoaded(true); } });
    return () => { live = false; };
  }, []);
  return { plan, loaded, pro: !loaded || !plan || plan.plan === 'pro' };
}

/** Friendly upgrade prompt shown in place of a Pro-only feature. */
export function ProUpsell({ feature, plan, compact = false }: { feature: ProFeature; plan: ClientPlan | null; compact?: boolean }) {
  const info = PRO_FEATURES[feature];
  const href = plan?.upgrade?.pro ?? '/pricing';
  const current = plan?.plan === 'solo' ? 'Solo' : 'Free';
  return (
    <div data-pro-upsell={feature} className={`rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)] ${compact ? 'px-3 py-2' : 'px-4 py-3'} text-sm text-[var(--text)]`}>
      <p className="flex items-center gap-2 font-semibold"><Lock size={14} aria-hidden /> {info.name} is part of Pro</p>
      {!compact && <p className="mt-1 text-[var(--text-muted)]">{info.blurb} You&apos;re on {current}; upgrade any time and keep everything you&apos;ve made.</p>}
      <p className="mt-2">
        <a className="font-semibold text-[var(--accent)] underline" href={href}>Upgrade to Pro, $29/mo</a>
        {' · '}<Link className="underline" href="/pricing">Compare plans</Link>
      </p>
    </div>
  );
}
