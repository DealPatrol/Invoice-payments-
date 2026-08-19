import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      where: { userId: session.user.id },
      include: { invoice: { include: { client: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(payments);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId, amount, method, reference } = body;

    // Verify invoice belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: session.user.id,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        invoiceId,
        amount,
        method,
        reference,
        status: 'pending',
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
