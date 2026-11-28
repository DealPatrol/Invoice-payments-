import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { ConnectNotConfigured, connectConfig, type ConnectConfig } from './config';
import { ConnectError, type StripeLike } from './service';

/** Platform Stripe client for Connect. Uses STRIPE_SECRET_KEY (a restricted key `rk_` is recommended). */
export function platformStripe(env: Record<string, string | undefined> = process.env): StripeLike {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new ConnectNotConfigured('STRIPE_SECRET_KEY is missing');
  return new Stripe(key, { appInfo: { name: 'Invoice Jot', url: 'https://invoicejot.com' } }) as unknown as StripeLike;
}

export function corsHeaders(cfg: Pick<ConnectConfig, 'allowedOrigins'> | null, origin: string | null): Record<string, string> {
  const h: Record<string, string> = { Vary: 'Origin', 'Cache-Control': 'no-store' };
  if (origin && cfg?.allowedOrigins.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '600';
  }
  return h;
}

function safeConfig(): ConnectConfig | null {
  try {
    return connectConfig();
  } catch {
    return null;
  }
}

export function preflight(req: Request): Response {
  return new NextResponse(null, { status: 204, headers: corsHeaders(safeConfig(), req.headers.get('origin')) });
}

export type Deps = { cfg: ConnectConfig; stripe: StripeLike };

/** Wraps a JSON POST handler: config + Stripe client, CORS, JSON body, consistent errors (never leaks Stripe internals). */
export async function jsonRoute(req: Request, fn: (body: Record<string, unknown>, deps: Deps) => Promise<unknown>, deps?: () => Deps): Promise<Response> {
  const origin = req.headers.get('origin');
  let cfg: ConnectConfig | null = null;
  try {
    const d = deps ? deps() : { cfg: connectConfig(), stripe: platformStripe() };
    cfg = d.cfg;
    let body: Record<string, unknown> = {};
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
    } catch {
      throw new ConnectError('Expected a JSON body.');
    }
    const out = await fn(body, d);
    return NextResponse.json(out, { headers: corsHeaders(cfg, origin) });
  } catch (e) {
    const headers = corsHeaders(cfg ?? safeConfig(), origin);
    if (e instanceof ConnectError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status, headers });
    if (e instanceof ConnectNotConfigured) return NextResponse.json({ error: e.message, code: 'not_configured' }, { status: 503, headers });
    const se = e as { type?: string; message?: string; statusCode?: number };
    if (se?.type && String(se.type).startsWith('Stripe')) {
      console.error('[connect] stripe error', se.type, se.message);
      return NextResponse.json({ error: 'Stripe could not complete that request. Please try again.', code: 'stripe_error' }, { status: 502, headers });
    }
    console.error('[connect] unexpected error', e);
    return NextResponse.json({ error: 'Something went wrong. Please try again.', code: 'server_error' }, { status: 500, headers });
  }
}
