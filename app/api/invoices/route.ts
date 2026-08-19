import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: { items: true, client: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invoices);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list invoices';
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
    const { clientId, invoiceNumber, amount, tax, currency, issueDate, dueDate, items } = body;

    const invoice = await prisma.invoice.create({
      data: {
        userId: session.user.id,
        clientId,
        invoiceNumber,
        amount,
        tax,
        total: amount + tax,
        currency,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        status: 'draft',
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            total: item.total,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
