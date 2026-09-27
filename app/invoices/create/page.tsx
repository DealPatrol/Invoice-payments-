'use client';

import { Suspense } from 'react';
import { CreateInvoiceForm } from '@/components/CreateInvoiceForm';
import { COLORS } from '@/lib/constants';

function CreateInvoiceContent() {
  return (
    <div className="min-h-screen" style={{ background: COLORS.background }}>
      <div className="p-8 max-w-4xl">
          <h1
            className="text-4xl font-black tracking-tight mb-2"
            style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
          >
            Create Invoice
          </h1>
          <p className="text-sm mb-8" style={{ color: COLORS.textMuted }}>
            Auto late-fee rules · recurring billing · instant client pay link
          </p>

          <Suspense fallback={<div>Loading...</div>}>
            <CreateInvoiceForm />
          </Suspense>
      </div>
    </div>
  );
}

export default function CreateInvoicePage() {
  return <CreateInvoiceContent />;
}
