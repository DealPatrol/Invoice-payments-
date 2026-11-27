'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Fingerprint, Sparkles } from 'lucide-react';
import { btnGhost, btnPrimary } from '@/components/ui/kit';
import { PREF_KEYS, toCachedInvoices } from '@/lib/native/offline-cache';

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${on ? 'bg-[var(--accent)]' : 'bg-[var(--surface-high)] ring-1 ring-inset ring-[var(--border)]'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

/** iPhone-only settings: Face ID lock, overdue reminders, App Store subscription. */
export function NativeSettings() {
  const [lock, setLock] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [bio, setBio] = useState<{ available: boolean; type: string } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    void (async () => {
      const [{ Preferences }, { InvoiceLabNative }] = await Promise.all([import('@capacitor/preferences'), import('@/lib/native/bridge')]);
      setLock((await Preferences.get({ key: PREF_KEYS.lockEnabled })).value === '1');
      setReminders((await Preferences.get({ key: PREF_KEYS.remindersEnabled })).value === '1');
      setBio(await InvoiceLabNative.biometryInfo().catch(() => ({ available: false, type: 'passcode' })));
    })();
  }, []);

  const bioName = bio?.type === 'faceId' ? 'Face ID' : bio?.type === 'touchId' ? 'Touch ID' : 'your passcode';

  async function toggleLock(next: boolean) {
    const [{ Preferences }, { InvoiceLabNative }] = await Promise.all([import('@capacitor/preferences'), import('@/lib/native/bridge')]);
    // Confirm the person changing the setting can actually unlock the phone.
    const res = await InvoiceLabNative.authenticate({ reason: next ? 'Turn on app lock' : 'Turn off app lock' });
    if (!res.ok) return;
    await Preferences.set({ key: PREF_KEYS.lockEnabled, value: next ? '1' : '0' });
    setLock(next);
  }

  async function toggleReminders(next: boolean) {
    const [{ Preferences }, { LocalNotifications }, bridge] = await Promise.all([
      import('@capacitor/preferences'),
      import('@capacitor/local-notifications'),
      import('@/components/native/NativeBridge'),
    ]);
    setNote('');
    if (next) {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') { setNote('Notifications are off for Invoice Jot. Turn them on in iOS Settings > Notifications.'); return; }
      await Preferences.set({ key: PREF_KEYS.remindersEnabled, value: '1' });
      const res = await fetch('/api/invoices', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (res) await bridge.scheduleReminders(toCachedInvoices(res.invoices));
      setNote('You will get a 9 AM nudge for overdue invoices and on due dates. Amounts never show on the lock screen.');
    } else {
      await Preferences.set({ key: PREF_KEYS.remindersEnabled, value: '0' });
      await bridge.cancelAllReminders();
    }
    setReminders(next);
  }

  async function manage() {
    const { InvoiceLabNative } = await import('@/lib/native/bridge');
    await InvoiceLabNative.manageSubscriptions().catch(() => undefined);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Fingerprint size={18} className="mt-0.5 text-[var(--accent)]" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text)]">Lock with {bioName}</p>
          <p className="text-sm text-[var(--text-muted)]">Ask for {bioName} when Invoice Jot opens or comes back from the background.</p>
        </div>
        <Toggle on={lock} onChange={(v) => void toggleLock(v)} label="App lock" disabled={bio ? !bio.available : true} />
      </div>
      <div className="flex items-start gap-3">
        <Bell size={18} className="mt-0.5 text-[var(--accent)]" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text)]">Overdue invoice reminders</p>
          <p className="text-sm text-[var(--text-muted)]">Local notifications on this iPhone when an invoice is due or past due.</p>
        </div>
        <Toggle on={reminders} onChange={(v) => void toggleReminders(v)} label="Overdue reminders" />
      </div>
      {note && <p className="rounded-lg bg-[var(--surface-high)] px-3 py-2 text-sm text-[var(--text-muted)]">{note}</p>}
      <div className="flex items-start gap-3">
        <Sparkles size={18} className="mt-0.5 text-[var(--accent)]" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text)]">Invoice Jot Pro</p>
          <p className="text-sm text-[var(--text-muted)]">Subscribe, restore purchases, or manage your App Store subscription.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/ios/upgrade" className={btnPrimary}>Get Pro / Restore</Link>
            <button type="button" onClick={() => void manage()} className={btnGhost}>Manage subscription</button>
            <Link href="/ios/drafts" className={btnGhost}>Offline drafts</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
