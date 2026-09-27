import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createSubscriptionCheckout } from '@/lib/billing';
import { isDemoMode } from '@/lib/config';

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ error: 'Billing is disabled in demo mode' }, { status: 503 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { plan } = await request.json();
    const checkout = await createSubscriptionCheckout(session.user.id, session.user.email, plan);
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
