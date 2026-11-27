import type { Database } from './types';
import { docTotals, displayStatus } from './calc';
import { normalizeDatabase } from './db';

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Every invoice and estimate, free on every plan. */
export function documentsCsv(db: Database): string {
  const rows: unknown[][] = [['Type', 'Number', 'Status', 'Title', 'Client', 'Client email', 'Issue date', 'Due date', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Balance', 'Currency', 'Paid on']];
  for (const d of [...db.docs].sort((a, b) => a.issueDate.localeCompare(b.issueDate))) {
    const t = docTotals(d);
    rows.push([d.kind, d.number, displayStatus(d), d.title, d.clientSnapshot?.name ?? '', d.clientSnapshot?.email ?? '', d.issueDate, d.dueDate, t.subtotal.toFixed(2), t.discount.toFixed(2), t.tax.toFixed(2), t.total.toFixed(2), t.paid.toFixed(2), t.balance.toFixed(2), db.business.currency, d.paidAt ? d.paidAt.slice(0, 10) : '']);
  }
  return toCsv(rows);
}

/** Payments by the date they were received (what you need at tax time). */
export function paymentsCsv(db: Database): string {
  const rows: unknown[][] = [['Payment date', 'Invoice', 'Client', 'Method', 'Amount', 'Currency']];
  const all = db.docs.flatMap((d) => d.payments.map((p) => ({ d, p }))).sort((a, b) => a.p.date.localeCompare(b.p.date));
  for (const { d, p } of all) rows.push([p.date, d.number, d.clientSnapshot?.name ?? '', p.method, p.amount.toFixed(2), db.business.currency]);
  return toCsv(rows);
}

export function clientsCsv(db: Database): string {
  return toCsv([['Name', 'Email', 'Phone', 'Address'], ...db.clients.map((c) => [c.name, c.email, c.phone, c.address])]);
}

export function receiptsCsv(db: Database): string {
  return toCsv([['Date', 'Vendor', 'Category', 'Amount', 'Note', 'Has photo'], ...db.receipts.map((r) => [r.date, r.vendor, r.category, r.amount.toFixed(2), r.note, r.photo ? 'yes' : 'no'])]);
}

export interface BackupFile {
  app: 'InvoiceJot';
  kind: 'backup';
  backupVersion: 1;
  exportedAt: string;
  db: Database;
}

export function backupJson(db: Database, now = new Date()): string {
  const file: BackupFile = { app: 'InvoiceJot', kind: 'backup', backupVersion: 1, exportedAt: now.toISOString(), db };
  return JSON.stringify(file, null, 1);
}

/** Parses a backup made by this app. Throws a readable error for anything else. */
export function parseBackup(text: string): Database {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not an Invoice Jot backup (it is not valid JSON).');
  }
  const o = (parsed ?? {}) as Partial<BackupFile>;
  if (o.app !== 'InvoiceJot' || !o.db) throw new Error('That file is not an Invoice Jot backup.');
  return normalizeDatabase(o.db);
}

export function backupFileName(now = new Date()): string {
  return `InvoiceJot-backup-${now.toISOString().slice(0, 10)}.json`;
}
