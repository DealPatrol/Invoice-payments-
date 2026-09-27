import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/invoice-service';
import { getTenantId, UnauthorizedError } from '@/lib/tenant';

export async function GET() {
  try {
    const userId = await getTenantId();
    const result = await getDashboardStats(userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to load stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
