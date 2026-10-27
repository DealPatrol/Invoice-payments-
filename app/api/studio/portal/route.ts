import { NextRequest, NextResponse } from 'next/server';
import { appUrl } from '@/lib/config';
import { studioUser } from '@/lib/studio-auth';
import { portalFor, revokePortal } from '@/lib/studio-server';

const validEmail = (v: unknown): v is string => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Creates (or returns) the client's portal link listing all of their invoices and estimates. */
export async function POST(request: NextRequest) {
  const auth = await studioUser();
  if ('response' in auth) return auth.response;
  const { email } = await request.json().catch(() => ({}));
  if (!validEmail(email)) return NextResponse.json({ error: 'Client needs an email address for a portal' }, { status: 400 });
  const token = await portalFor(auth.userId, email);
  return NextResponse.json({ token, url: `${appUrl()}/portal/${token}` });
}

export async function DELETE(request: NextRequest) {
  const auth = await studioUser();
  if ('response' in auth) return auth.response;
  const { email } = await request.json().catch(() => ({}));
  if (!validEmail(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  await revokePortal(auth.userId, email);
  return NextResponse.json({ revoked: true });
}
