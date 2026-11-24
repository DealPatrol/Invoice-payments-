import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { DELETE_CONFIRMATION_WORD, deleteAccountData } from '@/lib/account-deletion';
import { authOptions } from '@/lib/authOptions';
import { verifyPassword } from '@/lib/auth';
import { isDemoMode } from '@/lib/config';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/account — permanently deletes the signed-in account and all of its data.
 * Body: { confirm: "DELETE", password: string }. Requires the current session AND the password,
 * so a borrowed unlocked phone cannot wipe a business by accident.
 */
export async function DELETE(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ error: 'Account deletion is not available in the demo.' }, { status: 503 });
  }
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { confirm?: unknown; password?: unknown };
  if (body.confirm !== DELETE_CONFIRMATION_WORD) {
    return NextResponse.json({ error: `Type ${DELETE_CONFIRMATION_WORD} to confirm.` }, { status: 400 });
  }
  if (typeof body.password !== 'string' || !body.password) {
    return NextResponse.json({ error: 'Enter your password to confirm.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  if (!(await verifyPassword(body.password, user.password))) {
    return NextResponse.json({ error: 'That password is not correct.' }, { status: 403 });
  }

  // Stop future web billing before the account (and its Stripe ids) disappear.
  if (user.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== 'resource_missing') {
        console.error('Account deletion: could not cancel Stripe subscription', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'We could not cancel your web subscription. Please try again in a minute.' }, { status: 502 });
      }
    }
  }

  const hadAppleSubscription = (await prisma.appleSubscription.count({ where: { userId, status: 'active' } })) > 0;
  await deleteAccountData(prisma, userId, user.email);
  return NextResponse.json({ deleted: true, appleSubscriptionStillActive: hadAppleSubscription });
}
