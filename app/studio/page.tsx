import { Suspense } from 'react';
import { InvoiceStudio } from '@/components/studio/InvoiceStudio';

export const metadata = { title: 'Invoice Studio - InvoiceOS' };

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--text-muted)]">Loading studio…</div>}>
      <InvoiceStudio />
    </Suspense>
  );
}
