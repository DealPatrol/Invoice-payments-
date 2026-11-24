import { NextRequest, NextResponse } from 'next/server';
import { AppleJwsError, verifyAppleJws, type AppleNotificationPayload, type AppleTransaction } from '@/lib/apple-iap';
import { applyAppleNotificationTransaction } from '@/lib/apple-entitlements';
import { IOS_BUNDLE_ID } from '@/lib/native/iap';

export const dynamic = 'force-dynamic';

/**
 * App Store Server Notifications V2 (set this URL in App Store Connect > App Information).
 * Renewals, expirations, refunds and revocations update Pro even when the app is never opened.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { signedPayload?: unknown };
  if (typeof body.signedPayload !== 'string') return NextResponse.json({ error: 'Missing signedPayload' }, { status: 400 });
  try {
    const payload = verifyAppleJws<AppleNotificationPayload>(body.signedPayload);
    if (payload.data?.bundleId && payload.data.bundleId !== IOS_BUNDLE_ID) return NextResponse.json({ ignored: true });
    const signedTx = payload.data?.signedTransactionInfo;
    if (!signedTx) return NextResponse.json({ ok: true, type: payload.notificationType });
    const tx = verifyAppleJws<AppleTransaction>(signedTx);
    const applied = await applyAppleNotificationTransaction(tx);
    return NextResponse.json({ ok: true, type: payload.notificationType, applied: Boolean(applied) });
  } catch (error) {
    if (error instanceof AppleJwsError) return NextResponse.json({ error: error.message }, { status: 400 });
    // Database or other transient failure: a 5xx makes Apple retry the notification later.
    console.error('App Store notification failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Notification could not be processed' }, { status: 500 });
  }
}
