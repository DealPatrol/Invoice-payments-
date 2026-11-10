'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Usage {
  plan: 'free' | 'solo' | 'pro';
  onTrial: boolean;
  trialEndsAt: string;
  aiEstimatesPerMonth: number | null;
  photoEstimatesThisMonth: number;
  remaining: number | null;
  mode: 'demo' | 'postgres';
  upgrade: { solo: string; pro: string };
}

const NAMES = { free: 'Free', solo: 'Solo', pro: 'Pro' } as const;

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/** One-line plan + photo-estimate allowance, with upgrade links when they matter. */
export function PlanUsage({ onLoad }: { onLoad?: (usage: Usage) => void }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => {
    fetch('/api/plan').then((r) => (r.ok ? r.json() : null)).then((data: Usage | null) => {
      if (data) { setUsage(data); onLoad?.(data); }
    }).catch(() => undefined);
  }, [onLoad]);
  if (!usage || usage.mode === 'demo') return null;

  const left = usage.remaining;
  const out = left !== null && left <= 0;
  const text = usage.onTrial
    ? `Pro trial: ${daysLeft(usage.trialEndsAt)} day${daysLeft(usage.trialEndsAt) === 1 ? '' : 's'} left, unlimited photo estimates. No card on file; you drop to Free after, never locked out.`
    : left === null
      ? `${NAMES[usage.plan]} plan: unlimited photo estimates.`
      : `${NAMES[usage.plan]} plan: ${left} of ${usage.aiEstimatesPerMonth} photo estimates left this month.`;

  return (
    <div className={`mb-4 rounded-[10px] border px-4 py-3 text-sm ${out ? 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]' : 'border-[var(--border)] bg-[var(--surface-high)] text-[var(--text-muted)]'}`}>
      <span>{text}</span>
      {(usage.onTrial || usage.plan !== 'pro') && (
        <span className="ml-1">
          {usage.plan !== 'solo' && !usage.onTrial && <><a className="font-semibold text-[var(--accent)] underline" href={usage.upgrade.solo}>Solo $19/mo</a>{' · '}</>}
          <a className="font-semibold text-[var(--accent)] underline" href={usage.upgrade.pro}>{usage.onTrial ? 'Keep Pro, $29/mo' : 'Pro $29/mo'}</a>
          {' · '}<Link className="underline" href="/pricing">Compare plans</Link>
        </span>
      )}
    </div>
  );
}
