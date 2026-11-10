import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/authOptions';
import { jsonError } from '@/lib/field-http';
import { upgradeHref } from '@/lib/lab-plan';
import { getPlanUsage } from '@/lib/plan-usage';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getTenantId();
    const usage = await getPlanUsage(userId);
    const session = await getServerSession(authOptions).catch(() => null);
    const user = { id: userId, email: session?.user?.email ?? null };
    return NextResponse.json({ ...usage, upgrade: { solo: upgradeHref('solo', user), pro: upgradeHref('pro', user) } });
  } catch (error) {
    return jsonError(error, 'Could not load your plan');
  }
}
