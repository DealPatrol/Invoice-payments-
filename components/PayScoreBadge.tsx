'use client';

import { COLORS } from '@/lib/constants';

export function PayScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? COLORS.success : score >= 60 ? COLORS.warning : COLORS.danger;
  const label =
    score >= 80 ? 'Likely on time' : score >= 60 ? 'Monitor' : 'At risk';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 27%, transparent)`,
      }}
      title="Smart Pay Score — predicts on-time payment likelihood"
    >
      {score} · {label}
    </span>
  );
}
