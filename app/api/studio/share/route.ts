import { NextRequest, NextResponse } from 'next/server';
import { appUrl } from '@/lib/config';
import { studioUser } from '@/lib/studio-auth';
import { revokeShare, shareDocument } from '@/lib/studio-server';

/** Issues (or returns) the unguessable client link for a synced document. */
export async function POST(request: NextRequest) {
  const auth = await studioUser();
  if ('response' in auth) return auth.response;
  const { id, revoke } = await request.json().catch(() => ({}));
  if (typeof id !== 'string') return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (revoke) {
    await revokeShare(auth.userId, id);
    return NextResponse.json({ revoked: true });
  }
  const token = await shareDocument(auth.userId, id);
  if (!token) return NextResponse.json({ error: 'Document not found — save/sync it first' }, { status: 404 });
  return NextResponse.json({ token, url: `${appUrl()}/i/${token}` });
}
