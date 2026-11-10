'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/constants';

export function FieldWorkStrip() {
  const [jobs, setJobs] = useState(0);
  const [openEstimates, setOpenEstimates] = useState(0);

  useEffect(() => {
    fetch('/api/jobs').then((response) => response.json()).then((data) => {
      const list = data.jobs ?? [];
      setJobs(list.filter((job: { status: string }) => job.status !== 'completed' && job.status !== 'cancelled').length);
    }).catch(() => undefined);
    fetch('/api/estimates?status=sent').then((response) => response.json()).then((data) => {
      setOpenEstimates((data.estimates ?? []).length);
    }).catch(() => undefined);
  }, []);

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2">
      <Link href="/jobs" className="rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-xs)]" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Open jobs</p>
        <p className="mt-1 text-2xl font-bold tabular" style={{ color: COLORS.text }}>{jobs}</p>
      </Link>
      <Link href="/estimates" className="rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-xs)]" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Estimates waiting on the customer</p>
        <p className="mt-1 text-2xl font-bold tabular" style={{ color: COLORS.text }}>{openEstimates}</p>
      </Link>
    </div>
  );
}
