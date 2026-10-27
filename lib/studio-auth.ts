import { NextResponse } from 'next/server';
import { getTenantId, UnauthorizedError } from './tenant';
import { hasDatabase } from './studio-server';

/** Resolves the signed-in user for Studio cloud routes, or an error response. */
export async function studioUser(): Promise<{ userId: string } | { response: NextResponse }> {
  if (!hasDatabase()) return { response: NextResponse.json({ error: 'Cloud sync is not configured', cloud: false }, { status: 503 }) };
  try {
    return { userId: await getTenantId() };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { response: NextResponse.json({ error: 'Sign in to sync', cloud: true }, { status: 401 }) };
    throw e;
  }
}
