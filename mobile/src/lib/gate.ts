import type { Database, Doc } from './types';

/** Free plan: unlimited drafts, estimates and receipts; the first 3 invoices can be sent or exported. */
export const FREE_INVOICE_SENDS = 3;

export function freeSendsUsed(db: Database): number {
  return db.sentInvoiceIds.length;
}

export function freeSendsLeft(db: Database): number {
  return Math.max(0, FREE_INVOICE_SENDS - freeSendsUsed(db));
}

/**
 * Whether this document may be sent or exported as a PDF right now.
 * Never blocks: estimates, Pro users, or an invoice that was already sent once
 * (past records always stay viewable and exportable for free).
 */
export function canSendDoc(db: Database, doc: Pick<Doc, 'id' | 'kind'>, pro: boolean): boolean {
  if (pro || doc.kind !== 'invoice') return true;
  if (db.sentInvoiceIds.includes(doc.id)) return true;
  return freeSendsUsed(db) < FREE_INVOICE_SENDS;
}

/** Ask for an App Store review after the 1st and 3rd paid invoice only (iOS itself caps prompts at 3 a year). */
export function shouldAskForReview(paidCount: number, alreadyAsked: number[]): boolean {
  return (paidCount === 1 || paidCount === 3) && !alreadyAsked.includes(paidCount);
}

/** Free-plan PDFs carry a small footer; Pro removes it. */
export function pdfFooter(pro: boolean): string | null {
  return pro ? null : 'Made with Invoice Jot · invoicejot.com';
}

/**
 * Plain-language heads-up shown on an invoice BEFORE the user taps Send, so the paywall is never a surprise
 * (the most common complaint about competing apps is being "locked out in front of a client without notice").
 * Empty when nothing needs saying (Pro, estimates, invoices that were already sent once).
 */
export function preSendNotice(db: Database, doc: Pick<Doc, 'id' | 'kind'>, pro: boolean): string {
  if (pro || doc.kind !== 'invoice' || db.sentInvoiceIds.includes(doc.id)) return '';
  const left = freeSendsLeft(db);
  if (left <= 0) {
    return `You have used your ${FREE_INVOICE_SENDS} free invoice sends. Sending this one needs Invoice Jot Pro. Saving it as a draft, estimates and every past invoice stay free.`;
  }
  if (left === 1) {
    return 'This is your last free invoice send. After it, sending new invoices needs Invoice Jot Pro. Drafts, estimates and past invoices stay free.';
  }
  return `Sending uses 1 of your ${left} remaining free invoice sends. Re-sharing an invoice you already sent is always free.`;
}

/** Message after a successful free send, so the end of the free plan is announced before it happens again. */
export function postSendNotice(db: Database, pro: boolean, wasNewSend: boolean): string {
  if (pro || !wasNewSend) return '';
  const left = freeSendsLeft(db);
  if (left === 0) return `That was your last free invoice send. It stays free to view and share. New invoices need Invoice Jot Pro.`;
  return '';
}
