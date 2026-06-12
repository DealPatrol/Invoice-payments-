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

    const clients = await prisma.client.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(clients);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch clients';
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
    const { name, email, country, currency, taxId, address, phone } = body;

    const client = await prisma.client.create({
      data: {
        userId: session.user.id,
        name,
        email,
        country,
        currency,
        taxId,
        address,
        phone,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create client';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
