import { jsonRoute, preflight } from '@/lib/connect/http';
import { ConnectError, invoiceStatus, requireAccount } from '@/lib/connect/service';
import { verifyPayToken } from '@/lib/connect/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST {accountId, accountKey, token} -> paid status for that invoice, read live from Stripe. */
export function POST(req: Request) {
  return jsonRoute(req, async (body, { cfg, stripe }) => {
    const accountId = requireAccount(cfg, body);
    const p = verifyPayToken(cfg.linkSecret, body.token);
    if (!p || p.a !== accountId) throw new ConnectError('That payment link does not belong to this connection.', 400, 'bad_token');
    return invoiceStatus(stripe, { accountId, ref: p.r, currency: p.c, since: p.i, expectedMinor: p.m });
  });
}
export const OPTIONS = preflight;
