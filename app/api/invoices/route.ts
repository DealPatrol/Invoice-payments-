import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createInvoice, listInvoices } from '@/lib/invoice-service';

const createSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal('')),
  country: z.string(),
  currency: z.string(),
  network: z.string().optional(),
  dueDate: z.string(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitRate: z.number().min(0),
    })
  ),
  recurring: z.boolean().optional(),
  lateFeePercent: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const result = await listInvoices({ status, search });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list invoices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const result = await createInvoice({
      clientName: parsed.clientName,
      clientEmail: parsed.clientEmail || '',
      country: parsed.country,
      currency: parsed.currency,
      network: parsed.network,
      dueDate: parsed.dueDate,
      notes: parsed.notes,
      taxRate: parsed.taxRate,
      items: parsed.items,
      recurring: parsed.recurring,
      lateFeePercent: parsed.lateFeePercent,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : 'Failed to create invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
