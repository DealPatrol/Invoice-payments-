import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteInvoice, getInvoice, updateInvoiceStatus } from '@/lib/invoice-service';

const statusSchema = z.object({
  status: z.enum(['draft', 'sent', 'pending', 'paid', 'overdue']),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await getInvoice(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = statusSchema.parse(body);
    const invoice = await updateInvoiceStatus(params.id, status);
    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : 'Failed to update invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = await deleteInvoice(params.id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
