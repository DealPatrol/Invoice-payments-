'use client';

import { COLORS } from '@/lib/constants';
import { Database } from 'lucide-react';

export function DemoBanner({ mode }: { mode?: 'demo' | 'postgres' }) {
  if (mode !== 'demo') return null;
  return (
    <div
      className="mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
      style={{
        background: `${COLORS.accent}12`,
        borderColor: `${COLORS.accent}44`,
        color: COLORS.text,
      }}
    >
      <Database size={18} style={{ color: COLORS.accent }} />
      <span>
        <strong>Demo mode</strong> — data is stored in memory. Connect{' '}
        <a href="/settings" style={{ color: COLORS.accent }}>
          Supabase
        </a>{' '}
        for persistent production data.
      </span>
    </div>
  );
}
