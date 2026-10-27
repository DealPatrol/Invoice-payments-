import { NextRequest, NextResponse } from 'next/server';
import { appUrl } from '@/lib/config';
import { reminderDraft } from '@/lib/studio-ops';
import { emailEnabled, sendStudioEmail, strictlyAllowed } from '@/lib/studio-mail';
import { dueReminders } from '@/lib/studio-suite';
import { allWorkspaces, hasDatabase, markReminder, shareDocument, userDocuments } from '@/lib/studio-server';

/**
 * Daily overdue reminders for Invoice Studio. Sends only when STUDIO_EMAIL_ENABLED=true
 * and STUDIO_REMINDERS_AUTO=true and the recipient is on STUDIO_EMAIL_ALLOWLIST;
 * otherwise returns the drafts without contacting anyone.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ skipped: 'no database' });
  const today = new Date().toISOString().slice(0, 10);
  const auto = emailEnabled() && process.env.STUDIO_REMINDERS_AUTO === 'true';
  const sent: string[] = [];
  const drafts: { number: string; to: string; subject: string; reason: string }[] = [];
  for (const ws of await allWorkspaces()) {
    const docs = await userDocuments(ws.userId);
    for (const r of dueReminders(docs, today, ws.extras.reminderOffsets)) {
      const inv = docs.find((d) => d.id === r.invoiceId)!;
      const token = await shareDocument(ws.userId, inv.id);
      const draft = reminderDraft(inv, today, token ? `${appUrl()}/i/${token}` : '');
      const reason = !auto ? 'auto-send off' : !r.to ? 'no email' : !strictlyAllowed(r.to) ? 'not on allowlist' : '';
      if (reason) { drafts.push({ number: r.number, to: r.to, subject: draft.subject, reason }); continue; }
      try {
        await sendStudioEmail({ to: r.to, subject: draft.subject, text: draft.body, replyTo: inv.business.email || undefined });
        await markReminder(inv.id, ws.userId, `${r.key}@${today}`);
        sent.push(r.number);
      } catch (e) {
        drafts.push({ number: r.number, to: r.to, subject: draft.subject, reason: e instanceof Error ? e.message : 'send failed' });
      }
    }
  }
  return NextResponse.json({ today, auto, sent, drafts });
}
