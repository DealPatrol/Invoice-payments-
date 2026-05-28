import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/invoice-service';

export async function GET() {
  try {
    const result = await getDashboardStats();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
