import type { Database } from '../lib/types';
import { backupFileName, backupJson } from '../lib/exporters';
import { markBackedUp } from '../lib/db';
import { shareFile } from '../lib/native';

/** Exports a full JSON backup through the share sheet and records it only if the user actually saved or shared it. */
export async function runBackup(db: Database, update: (fn: (d: Database) => Database) => void, toast: (m: string) => void): Promise<void> {
  try {
    const shared = await shareFile(backupFileName(), { text: backupJson(db) }, 'application/json', 'Back up Invoice Jot');
    if (shared) {
      update((d) => markBackedUp(d));
      toast('Backup saved');
    }
  } catch (e) {
    toast(`Backup failed: ${String((e as Error)?.message ?? e)}`);
  }
}
