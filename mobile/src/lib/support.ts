import type { Database } from './types';
import { APP_VERSION, APP_NAME, SUPPORT_EMAIL } from './config';

export interface Diagnostics {
  version: string;
  platform: string;
  pro: boolean;
  documents: number;
  clients: number;
  receipts: number;
  freeSendsUsed: number;
  lastBackupAt: string | null;
}

/** Counts only. Never includes names, amounts, notes, photos or any invoice content. */
export function diagnostics(db: Database, pro: boolean, platform: string): Diagnostics {
  return {
    version: APP_VERSION,
    platform,
    pro,
    documents: db.docs.length,
    clients: db.clients.length,
    receipts: db.receipts.length,
    freeSendsUsed: db.sentInvoiceIds.length,
    lastBackupAt: db.lastBackupAt,
  };
}

/**
 * A pre-filled support email. The user sees and can edit all of it before sending (it opens in their mail app),
 * and nothing is sent by the app itself.
 */
export function supportMailto(d: Diagnostics): string {
  const body = [
    'What happened? (Please tell us what you tapped and what you expected)',
    '',
    '',
    '',
    '---',
    'Diagnostics (counts only, no invoice content):',
    `${APP_NAME} ${d.version} · ${d.platform}`,
    `Plan: ${d.pro ? 'Pro' : 'Free'} · documents ${d.documents} · clients ${d.clients} · receipts ${d.receipts} · free sends used ${d.freeSendsUsed}`,
    `Last backup: ${d.lastBackupAt ? d.lastBackupAt.slice(0, 10) : 'never'}`,
  ].join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} problem report`)}&body=${encodeURIComponent(body)}`;
}

export function platformLabel(userAgent: string, native: boolean): string {
  const m = /OS (\d+)[_.](\d+)/.exec(userAgent);
  return `${native ? 'iPhone app' : 'web preview'}${m ? ` · iOS ${m[1]}.${m[2]}` : ''}`;
}
