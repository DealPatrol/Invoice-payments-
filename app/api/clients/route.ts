import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PRICING, isDemoMode, isPlan } from '@/lib/config';
import { SAMPLE_CLIENTS } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { getTenantId, UnauthorizedError } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const clientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  country: z.string().min(1),
  currency: z.string().length(3).default('USD'),
  taxId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await getTenantId();
    if (isDemoMode()) return NextResponse.json({ clients: SAMPLE_CLIENTS, mode: 'demo' });

    const clients = await prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ clients, mode: 'postgres' });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch clients';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const input = clientSchema.parse(await request.json());
    if (isDemoMode()) {
      return NextResponse.json({ id: `demo-client-${Date.now()}`, ...input }, { status: 201 });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const plan = isPlan(user.plan) ? user.plan : 'starter';
    const limit = PRICING[plan].clients;
    const count = await prisma.client.count({ where: { userId } });
    if (limit !== null && count >= limit) {
      return NextResponse.json(
        { error: `${PRICING[plan].name} allows ${limit} clients` },
        { status: 403 }
      );
    }
    const client = await prisma.client.create({
      data: { userId, ...input, email: input.email.toLowerCase() },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create client';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
