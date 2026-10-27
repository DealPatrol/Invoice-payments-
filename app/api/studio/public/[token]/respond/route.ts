import { NextRequest, NextResponse } from 'next/server';
import { hasDatabase, respondToEstimate } from '@/lib/studio-server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!hasDatabase()) return NextResponse.json({ error: 'Not available' }, { status: 503 });
  const { token } = await params;
  const { action, name } = await request.json().catch(() => ({}));
  if (action !== 'accept' && action !== 'decline') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  if (typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'Please type your name' }, { status: 400 });
  const result = await respondToEstimate(token, action, name.trim());
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ estimateStatus: result.invoice.estimateStatus });
}
