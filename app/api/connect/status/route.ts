import { jsonRoute, preflight } from '@/lib/connect/http';
import { accountStatus, requireAccount } from '@/lib/connect/service';
import { feePercentLabel } from '@/lib/connect/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST {accountId, accountKey} -> account state (needs_onboarding | pending | active | restricted) + fee. */
export function POST(req: Request) {
  return jsonRoute(req, async (body, { cfg, stripe }) => ({ ...(await accountStatus(stripe, requireAccount(cfg, body))), feeBps: cfg.feeBps, feeLabel: feePercentLabel(cfg.feeBps) }));
}
export const OPTIONS = preflight;
