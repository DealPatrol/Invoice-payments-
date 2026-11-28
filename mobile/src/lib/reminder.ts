import type { Business, Doc } from './types';
import { displayStatus, docTotals } from './calc';
import { formatDate, formatMoney, todayISO } from './util';

/** A payment reminder only makes sense for an invoice that was sent and still has a balance. */
export function canRemind(doc: Doc, today: string = todayISO()): boolean {
  if (doc.kind !== 'invoice' || !doc.sentAt) return false;
  const st = displayStatus(doc, today);
  return st === 'sent' || st === 'partial' || st === 'overdue';
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/**
 * A short, polite text/email the owner can send from the share sheet. Nothing is sent by the app itself
 * and nothing leaves the phone until the user picks a destination.
 */
export function reminderText(doc: Doc, business: Business, today: string = todayISO()): string {
  const t = docTotals(doc);
  const cur = business.currency;
  const name = (doc.clientSnapshot?.name || '').trim().split(/\s+/)[0];
  const hello = name ? `Hi ${name},` : 'Hello,';
  const overdueDays = doc.dueDate ? daysBetween(doc.dueDate, today) : 0;
  const when = !doc.dueDate
    ? ''
    : overdueDays > 0
      ? ` It was due on ${formatDate(doc.dueDate)} (${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} ago).`
      : overdueDays === 0
        ? ' It is due today.'
        : ` It is due on ${formatDate(doc.dueDate)}.`;
  const partial = t.paid > 0 ? ` We received ${formatMoney(t.paid, cur)} so far.` : '';
  const link = (doc.paymentLink || business.paymentLink || '').trim();
  const lines = [
    `${hello} a friendly reminder about invoice ${doc.number}${doc.title ? ` (${doc.title})` : ''}.${when}${partial}`,
    `Balance due: ${formatMoney(t.balance, cur)}.`,
  ];
  if (link) lines.push(`Pay online: ${link}`);
  if (business.paymentInstructions.trim()) lines.push(business.paymentInstructions.trim());
  lines.push(`Thank you!${business.name ? `\n${business.name}` : ''}${business.phone ? ` · ${business.phone}` : ''}`);
  return lines.join('\n\n');
}
