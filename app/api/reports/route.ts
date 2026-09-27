import { NextResponse } from 'next/server';
import { listInvoices } from '@/lib/invoice-service';
import { getTenantId, UnauthorizedError } from '@/lib/tenant';
import type { ReportsData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getTenantId();
    const { invoices, mode } = await listInvoices(userId);
    const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const revenue = invoices
      .filter((invoice) => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const aging: ReportsData['aging'] = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days60plus: 0,
    };
    const today = new Date();
    for (const invoice of invoices.filter((item) => item.status !== 'paid')) {
      const days = Math.floor(
        (today.getTime() - new Date(invoice.dueDate).getTime()) / 86_400_000
      );
      if (days <= 0) aging.current += invoice.total;
      else if (days <= 30) aging.days1to30 += invoice.total;
      else if (days <= 60) aging.days31to60 += invoice.total;
      else aging.days60plus += invoice.total;
    }
    const data: ReportsData = {
      revenue,
      totalBilled,
      outstanding: totalBilled - revenue,
      collectionRate: totalBilled ? Math.round((revenue / totalBilled) * 1000) / 10 : 0,
      aging,
    };
    return NextResponse.json({ reports: data, mode });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to load reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
