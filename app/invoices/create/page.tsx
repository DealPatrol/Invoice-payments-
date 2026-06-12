'use client';

import { Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { CreateInvoiceForm } from '@/components/CreateInvoiceForm';
import { COLORS } from '@/lib/constants';

function CreateInvoiceContent() {
  return (
    <div className="flex min-h-screen" style={{ background: COLORS.background }}>
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen overflow-y-auto">
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
      </main>
    </div>
  );
}

export default function CreateInvoicePage() {
  return <CreateInvoiceContent />;
}
