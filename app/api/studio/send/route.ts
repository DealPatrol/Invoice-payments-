import { NextRequest, NextResponse } from 'next/server';
import { appUrl } from '@/lib/config';
import { studioUser } from '@/lib/studio-auth';
import { emailEnabled, sendStudioEmail } from '@/lib/studio-mail';
import { loadSnapshot, shareDocument } from '@/lib/studio-server';
import { amountDue } from '@/lib/studio-ops';
import { formatMoney } from '@/lib/studio';

/** Emails the secure client link. Disabled unless STUDIO_EMAIL_ENABLED=true. */
export async function POST(request: NextRequest) {
  if (!emailEnabled()) return NextResponse.json({ error: 'Email sending is turned off (STUDIO_EMAIL_ENABLED).' }, { status: 503 });
  const auth = await studioUser();
  if ('response' in auth) return auth.response;
  const { id } = await request.json().catch(() => ({}));
  const inv = (await loadSnapshot(auth.userId)).invoices.find((i) => i.id === id);
  if (!inv) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  if (!inv.customer.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
  const token = await shareDocument(auth.userId, inv.id);
  const link = `${appUrl()}/i/${token}`;
  const label = inv.kind === 'estimate' ? 'Estimate' : 'Invoice';
  const today = new Date().toISOString().slice(0, 10);
  const text = `Hi ${inv.customer.name || 'there'},\n\n${inv.business.name} sent you ${label.toLowerCase()} ${inv.number}` +
    (inv.kind === 'invoice' ? ` for ${formatMoney(amountDue(inv, today), inv.business.currency)}, due ${inv.dueDate}` : '') +
    `.\n\nView it here: ${link}\n\nThank you,\n${inv.business.name}`;
  try {
    const sent = await sendStudioEmail({ to: inv.customer.email, subject: `${label} ${inv.number} from ${inv.business.name}`, text, replyTo: inv.business.email || undefined });
    return NextResponse.json({ sent: true, id: sent.id, link });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Send failed' }, { status: 400 });
  }
}
