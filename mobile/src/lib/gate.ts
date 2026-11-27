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
