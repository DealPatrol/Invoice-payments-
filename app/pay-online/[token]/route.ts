import { NextResponse } from 'next/server';
import { connectConfig } from '@/lib/connect/config';
import { platformStripe } from '@/lib/connect/http';
import { startCheckout } from '@/lib/connect/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The "Pay online" link printed on Invoice Jot invoices. Opens a fresh Stripe-hosted Checkout page
 * for the amount signed into the link, as a direct charge on the business's own Stripe account.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  let site = 'https://invoicejot.com';
  try {
    const cfg = connectConfig();
    site = cfg.siteUrl;
    const r = await startCheckout(platformStripe(), cfg, token);
    if (r.kind === 'redirect') return NextResponse.redirect(r.url, 303);
    if (r.kind === 'paid') return NextResponse.redirect(`${site}/paid?status=already`, 303);
    return NextResponse.redirect(`${site}/paid?status=unavailable&code=${r.code}`, 303);
  } catch (e) {
    console.error('[pay-online] failed', (e as Error)?.message);
    void req;
    return NextResponse.redirect(`${site}/paid?status=unavailable&code=error`, 303);
  }
}
