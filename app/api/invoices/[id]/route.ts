import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteInvoice, getInvoice, updateInvoiceStatus } from '@/lib/invoice-service';
import { getTenantId, UnauthorizedError } from '@/lib/tenant';

const statusSchema = z.object({
  status: z.enum(['draft', 'sent', 'pending', 'paid', 'overdue']),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getTenantId();
    const invoice = await getInvoice(userId, params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getTenantId();
    const body = await request.json();
    const { status } = statusSchema.parse(body);
    const invoice = await updateInvoiceStatus(userId, params.id, status);
    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to update invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getTenantId();
    const ok = await deleteInvoice(userId, params.id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
