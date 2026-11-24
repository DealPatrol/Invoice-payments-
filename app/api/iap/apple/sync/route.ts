import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { appAccountTokenFor, AppleJwsError } from '@/lib/apple-iap';
import { AppleOwnershipError, syncAppleJws, type AppliedAppleEntitlement } from '@/lib/apple-entitlements';
import { authOptions } from '@/lib/authOptions';
import { isDemoMode } from '@/lib/config';
import { IOS_PRO_PRODUCT_IDS } from '@/lib/native/iap';

export const dynamic = 'force-dynamic';

async function sessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** GET: the appAccountToken the iOS app passes to StoreKit for this account, plus product ids. */
export async function GET() {
  if (isDemoMode()) return NextResponse.json({ demo: true, productIds: IOS_PRO_PRODUCT_IDS, appAccountToken: null });
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: 'Sign in to subscribe' }, { status: 401 });
  return NextResponse.json({ productIds: IOS_PRO_PRODUCT_IDS, appAccountToken: appAccountTokenFor(userId) });
}

/**
 * POST { transactions: string[] } — StoreKit 2 signed transactions (JWS) from the device.
 * Each one is verified against Apple's certificate chain before Pro is unlocked.
 */
export async function POST(request: NextRequest) {
  if (isDemoMode()) return NextResponse.json({ error: 'App Store purchases are not available in the demo.' }, { status: 503 });
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { transactions?: unknown };
  const list = Array.isArray(body.transactions) ? body.transactions.filter((t): t is string => typeof t === 'string').slice(0, 20) : [];
  if (list.length === 0) return NextResponse.json({ entitlements: [] });

  const entitlements: AppliedAppleEntitlement[] = [];
  for (const jws of list) {
    try {
      entitlements.push(await syncAppleJws(userId, jws));
    } catch (error) {
      if (error instanceof AppleOwnershipError) return NextResponse.json({ error: error.message }, { status: 409 });
      if (error instanceof AppleJwsError) return NextResponse.json({ error: `Could not verify purchase: ${error.message}` }, { status: 400 });
      throw error;
    }
  }
  return NextResponse.json({ entitlements, pro: entitlements.some((e) => e.status === 'active') });
}
