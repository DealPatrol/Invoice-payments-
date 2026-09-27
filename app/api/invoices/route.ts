import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createInvoice, listInvoices } from '@/lib/invoice-service';
import { getTenantId, UnauthorizedError } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const invoiceSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().or(z.literal('')),
  country: z.string().min(1),
  currency: z.string().length(3),
  network: z.string().optional(),
  dueDate: z.string().min(1),
  notes: z.string().optional(),
  taxRate: z.number().min(0),
  recurring: z.boolean().optional(),
  lateFeePercent: z.number().min(0).max(100).optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitRate: z.number().min(0),
  })).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const result = await listInvoices(userId, { status, search });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to list invoices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const input = invoiceSchema.parse(await request.json());
    const { invoice, mode } = await createInvoice(userId, input);
    return NextResponse.json({ ...invoice, mode }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    const status = message.includes('allows') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
