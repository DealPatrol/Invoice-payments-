import { NextRequest, NextResponse } from 'next/server';
import { studioUser } from '@/lib/studio-auth';
import { loadSnapshot, mergeServerPayments, mergeServerTracking, saveSnapshot, type StudioSnapshot } from '@/lib/studio-server';
import { normalizeInvoice } from '@/lib/studio';

export async function GET() {
  const auth = await studioUser();
  if ('response' in auth) return auth.response;
  return NextResponse.json({ cloud: true, ...(await loadSnapshot(auth.userId)) });
}

export async function PUT(request: NextRequest) {
  const auth = await studioUser();
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.invoices) || !Array.isArray(body.clients) || !Array.isArray(body.catalog)) {
    return NextResponse.json({ error: 'Invalid snapshot' }, { status: 400 });
  }
  if (body.invoices.length > 5000) return NextResponse.json({ error: 'Too many documents' }, { status: 413 });
  const current = await loadSnapshot(auth.userId);
  const byId = new Map(current.invoices.map((i) => [i.id, i]));
  const snap: StudioSnapshot = {
    profile: body.profile ?? null,
    clients: body.clients,
    catalog: body.catalog,
    extras: body.extras && typeof body.extras === 'object' ? body.extras : undefined,
    invoices: body.invoices.map((raw: object) => {
      const inv = normalizeInvoice(raw);
      const server = byId.get(inv.id) ?? null;
      const merged = mergeServerTracking(mergeServerPayments(inv, server), server);
      // Estimate responses come from the client link and are server-owned.
      return server?.clientResponse ? { ...merged, clientResponse: server.clientResponse, estimateStatus: merged.estimateStatus === 'converted' ? 'converted' : server.estimateStatus } : merged;
    }),
  };
  try {
    await saveSnapshot(auth.userId, snap, body.prune !== false);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Sync failed' }, { status: 409 });
  }
  return NextResponse.json({ cloud: true, ...(await loadSnapshot(auth.userId)) });
}
