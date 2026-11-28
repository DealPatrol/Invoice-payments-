import { describe, expect, it } from 'vitest';
import { createDoc, emptyDatabase, markBackedUp, normalizeDatabase, snoozeBackupReminder } from '../mobile/src/lib/db';
import { BACKUP_MIN_DOCS, backupReminder, lastBackupLabel } from '../mobile/src/lib/backup';
import { backupJson, parseBackup } from '../mobile/src/lib/exporters';
import type { Database } from '../mobile/src/lib/types';

const day = (iso: string, plus = 0) => new Date(Date.parse(`${iso}T12:00:00Z`) + plus * 86400000);

function withDocs(n: number, createdOn = '2026-10-01'): Database {
  let db = emptyDatabase();
  for (let i = 0; i < n; i++) {
    const r = createDoc(db, 'invoice', createdOn);
    db = { ...r.db, docs: r.db.docs.map((d) => (d.id === r.doc.id ? { ...d, createdAt: `${createdOn}T12:00:00.000Z` } : d)) };
  }
  return db;
}

describe('backup reminder (data loss is a top complaint about invoice apps)', () => {
  it('stays quiet for people with almost nothing to lose', () => {
    expect(BACKUP_MIN_DOCS).toBe(2);
    expect(backupReminder(withDocs(1), day('2027-03-01')).due).toBe(false);
    expect(backupReminder(emptyDatabase(), day('2027-03-01')).due).toBe(false);
  });

  it('does not nag in the first two weeks, then asks once the user has never backed up', () => {
    const db = withDocs(3, '2026-11-01');
    expect(backupReminder(db, day('2026-11-10')).due).toBe(false);
    const r = backupReminder(db, day('2026-11-20'));
    expect(r.due).toBe(true);
    expect(r.body).toMatch(/not backed up yet/);
    expect(r.body).toMatch(/3 documents/);
  });

  it('asks again 30 days after the last backup, not before', () => {
    const db = markBackedUp(withDocs(3, '2026-09-01'), '2026-11-01T10:00:00.000Z');
    expect(backupReminder(db, day('2026-11-20')).due).toBe(false);
    const r = backupReminder(db, day('2026-12-05'));
    expect(r.due).toBe(true);
    expect(r.body).toMatch(/34 days ago/);
  });

  it('"Later" snoozes for the chosen days and a backup clears the snooze', () => {
    const db = withDocs(3, '2026-09-01');
    const snoozed = snoozeBackupReminder(db, 14, day('2026-11-20'));
    expect(backupReminder(snoozed, day('2026-11-30')).due).toBe(false);
    expect(backupReminder(snoozed, day('2026-12-05')).due).toBe(true);
    const done = markBackedUp(snoozed, '2026-12-05T10:00:00.000Z');
    expect(done.backupSnoozedUntil).toBeNull();
    expect(backupReminder(done, day('2026-12-06')).due).toBe(false);
  });

  it('labels the last backup for Settings', () => {
    const now = day('2026-12-10');
    expect(lastBackupLabel(emptyDatabase(), now)).toBe('Last backup: never');
    expect(lastBackupLabel(markBackedUp(emptyDatabase(), '2026-12-10T08:00:00.000Z'), now)).toBe('Last backup: today');
    expect(lastBackupLabel(markBackedUp(emptyDatabase(), '2026-12-09T08:00:00.000Z'), now)).toBe('Last backup: yesterday');
    expect(lastBackupLabel(markBackedUp(emptyDatabase(), '2026-12-03T08:00:00.000Z'), now)).toBe('Last backup: 7 days ago');
  });

  it('old data without the new fields still loads, and the fields survive a backup round-trip', () => {
    const old = { ...emptyDatabase() } as Record<string, unknown>;
    delete old.lastBackupAt;
    delete old.backupSnoozedUntil;
    const loaded = normalizeDatabase(old);
    expect(loaded.lastBackupAt).toBeNull();
    expect(loaded.backupSnoozedUntil).toBeNull();
    const db = markBackedUp(withDocs(2), '2026-11-27T10:00:00.000Z');
    expect(parseBackup(backupJson(db)).lastBackupAt).toBe('2026-11-27T10:00:00.000Z');
  });
});
