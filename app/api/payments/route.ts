import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isDemoMode } from '@/lib/config';
import { prisma } from '@/lib/db';
import { getTenantId, UnauthorizedError } from '@/lib/tenant';

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['stripe', 'bank_transfer', 'cash', 'check']),
  reference: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await getTenantId();
    if (isDemoMode()) return NextResponse.json({ payments: [], mode: 'demo' });

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: { invoice: { include: { client: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payments, mode: 'postgres' });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const input = paymentSchema.parse(await request.json());
    if (isDemoMode()) {
      return NextResponse.json(
        { id: `demo-payment-${Date.now()}`, ...input, status: 'pending' },
        { status: 201 }
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, userId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        ...input,
        status: 'pending',
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
