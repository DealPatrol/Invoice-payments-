import { jsonRoute, preflight } from '@/lib/connect/http';
import { createPayLink, requireAccount } from '@/lib/connect/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST {accountId, accountKey, amount, currency, invoiceNumber, ref} -> {url, token, amountMinor, currency, feeMinor}. Signs a link; no Stripe call. */
export function POST(req: Request) {
  return jsonRoute(req, async (body, { cfg }) => createPayLink(cfg, requireAccount(cfg, body), body));
}
export const OPTIONS = preflight;
