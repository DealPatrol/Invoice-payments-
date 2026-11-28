import type { Database } from './types';

/** Back up reminder timing. Never blocks anything; it is a dismissible card on Home. */
export const BACKUP_REMIND_AFTER_DAYS = 30;
/** Someone who has never backed up gets the first reminder after this many days of using the app. */
export const FIRST_BACKUP_REMIND_AFTER_DAYS = 14;
export const BACKUP_SNOOZE_DAYS = 14;
/** Do not nag people who have almost nothing to lose. */
export const BACKUP_MIN_DOCS = 2;

const DAY = 86400000;

export function daysSince(iso: string, now: Date): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY));
}

export interface BackupReminder {
  due: boolean;
  /** Short headline for the Home card. */
  title: string;
  /** One honest sentence about why. */
  body: string;
}

const QUIET: BackupReminder = { due: false, title: '', body: '' };

/**
 * Data loss is a top complaint about invoice apps (lost invoices after sign-out, updates or storage clean-ups).
 * Invoice Jot keeps everything only on the iPhone, so a periodic reminder to export a copy is part of the promise.
 */
export function backupReminder(db: Database, now: Date = new Date()): BackupReminder {
  if (db.docs.length < BACKUP_MIN_DOCS) return QUIET;
  if (db.backupSnoozedUntil && Date.parse(db.backupSnoozedUntil) > now.getTime()) return QUIET;
  const n = db.docs.length;
  if (db.lastBackupAt) {
    const d = daysSince(db.lastBackupAt, now);
    if (d < BACKUP_REMIND_AFTER_DAYS) return QUIET;
    return { due: true, title: 'Time for a fresh backup', body: `Your last backup was ${d} days ago. Your ${n} documents live only on this iPhone, so save a copy to Files or iCloud Drive.` };
  }
  const first = db.docs.reduce((min, d) => (d.createdAt < min ? d.createdAt : min), db.docs[0].createdAt);
  if (daysSince(first, now) < FIRST_BACKUP_REMIND_AFTER_DAYS) return QUIET;
  return { due: true, title: 'Back up your invoices', body: `You have not backed up yet. Your ${n} documents live only on this iPhone, so save a copy to Files or iCloud Drive. It takes a few seconds.` };
}

/** Text for Settings: "Last backup: 3 days ago" / "never". */
export function lastBackupLabel(db: Database, now: Date = new Date()): string {
  if (!db.lastBackupAt) return 'Last backup: never';
  const d = daysSince(db.lastBackupAt, now);
  return d === 0 ? 'Last backup: today' : d === 1 ? 'Last backup: yesterday' : `Last backup: ${d} days ago`;
}
