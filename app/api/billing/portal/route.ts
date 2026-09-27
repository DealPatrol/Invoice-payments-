import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createPortalSession } from '@/lib/billing';
import { isDemoMode } from '@/lib/config';

export async function POST() {
  if (isDemoMode()) {
    return NextResponse.json({ error: 'Billing is disabled in demo mode' }, { status: 503 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const portal = await createPortalSession(session.user.id);
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal unavailable';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
