'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { btnGhost } from '@/components/ui/kit';
import { DELETE_CONFIRMATION_WORD } from '@/lib/account-deletion-constants';
import { useIsNativeIos } from '@/lib/native/useIsNativeIos';

/**
 * In-app account deletion (App Review Guideline 5.1.1(v)); available on web and iOS.
 * Two-step: open the dialog, then type DELETE and the account password.
 */
export function DeleteAccount() {
  const native = useIsNativeIos();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ apple: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm, password }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) { setError(data.error || 'Could not delete the account. Check your connection and try again.'); return; }
    if (native) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.clear().catch(() => undefined); // cached clients, invoices and drafts on this iPhone
    }
    setDone({ apple: Boolean(data.appleSubscriptionStillActive) });
  }

  if (done) {
    return (
      <div className="text-sm text-[var(--text)]">
        <p className="font-semibold">Your account and all of its data have been deleted.</p>
        {(done.apple || native) && (
          <p className="mt-2 text-[var(--text-muted)]">
            If you subscribed through the App Store, Apple keeps billing until you cancel: open Settings &gt; Apple ID &gt; Subscriptions on your iPhone.
          </p>
        )}
        <button type="button" className={`${btnGhost} mt-4`} onClick={() => void signOut({ callbackUrl: '/login' })}>Finish</button>
      </div>
    );
  }

  if (!open) {
    return (
      <div>
        <p className="text-sm text-[var(--text-muted)]">Permanently delete your Invoice Jot account, clients, estimates, invoices, jobs, photos and payment records. Any web subscription is cancelled.</p>
        <button type="button" onClick={() => setOpen(true)} className={`${btnGhost} mt-4 text-[var(--danger)]`}><Trash2 size={14} />Delete account</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Delete account">
      <p className="flex items-start gap-2 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
        This cannot be undone. Client links you have sent will stop working.
      </p>
      <label className="block text-sm font-medium text-[var(--text)]">
        Type <b>{DELETE_CONFIRMATION_WORD}</b> to confirm
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="characters" autoComplete="off"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </label>
      <label className="block text-sm font-medium text-[var(--text)]">
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || confirm !== DELETE_CONFIRMATION_WORD || !password}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <Trash2 size={14} />{busy ? 'Deleting…' : 'Permanently delete'}
        </button>
        <button type="button" className={btnGhost} onClick={() => { setOpen(false); setConfirm(''); setPassword(''); setError(''); }}>Cancel</button>
      </div>
    </form>
  );
}
