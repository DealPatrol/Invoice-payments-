'use client';

import { Suspense } from 'react';
import { CreateInvoiceForm } from '@/components/CreateInvoiceForm';
import { Page, PageHeader, Panel, SkeletonRows } from '@/components/ui/kit';

export default function CreateInvoicePage() {
  return (
    <Page narrow>
      <PageHeader eyebrow="Invoices" title="Create invoice" subtitle="Auto late-fee rules · recurring billing · instant client pay link" />
      <Suspense fallback={<Panel flush><SkeletonRows rows={5} /></Panel>}>
        <CreateInvoiceForm />
      </Suspense>
    </Page>
  );
}
