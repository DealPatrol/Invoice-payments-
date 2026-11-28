import { useCallback, useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useApp } from '../store';
import { Btn, Screen } from '../ui';
import { CARD_COUNTRIES, STATE_LABEL, cardApi, clearConnection, loadConnection, saveConnection, type CardConnection } from '../lib/cardPayments';
import { openExternal, success } from '../lib/native';
import { PRIVACY_URL } from '../lib/config';

const api = cardApi();

export function GetPaid() {
  const { db, toast } = useApp();
  const [conn, setConn] = useState<CardConnection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [country, setCountry] = useState('us');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async (c: CardConnection | null, quiet = false) => {
    if (!c) return;
    setErr(null);
    if (!quiet) setBusy('status');
    try {
      const s = await api.status(c);
      const next: CardConnection = { ...c, state: s.state, feeLabel: s.feeLabel || c.feeLabel, checkedAt: new Date().toISOString() };
      await saveConnection(next);
      setConn(next);
      if (!quiet && s.state === 'active') success();
    } catch (e) {
      if (!quiet) setErr((e as Error).message);
    } finally {
      if (!quiet) setBusy(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void loadConnection().then((c) => {
      if (!alive) return;
      setConn(c);
      setLoaded(true);
      if (c) void refresh(c, true);
    });
    // Coming back from Stripe onboarding (Safari -> invoicejot://stripe/return, or app switcher).
    const subs = [
      CapApp.addListener('resume', () => void loadConnection().then((c) => c && refresh(c, true))),
      CapApp.addListener('appUrlOpen', (e) => {
        if (e.url.startsWith('invoicejot://stripe')) void loadConnection().then((c) => c && refresh(c));
      }),
    ];
    return () => {
      alive = false;
      for (const s of subs) void s.then((h) => h.remove()).catch(() => undefined);
    };
  }, [refresh]);

  const connect = async () => {
    setErr(null);
    setBusy('connect');
    try {
      const r = await api.createAccount(country, db.business.currency);
      const c: CardConnection = { accountId: r.accountId, accountKey: r.accountKey, country, state: 'needs_onboarding', feeLabel: '1%', checkedAt: null };
      await saveConnection(c);
      setConn(c);
      openExternal(r.onboardingUrl);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const continueSetup = async () => {
    if (!conn) return;
    setErr(null);
    setBusy('link');
    try {
      openExternal((await api.onboardingLink(conn)).url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect card payments on this iPhone? Your Stripe account and its money stay yours, and existing “Pay online” links keep working until you replace them.')) return;
    await clearConnection();
    setConn(null);
    toast('Card payments disconnected on this iPhone');
  };

  if (!loaded) return <Screen title="Get paid with card"><p className="muted">Loading…</p></Screen>;

  return (
    <Screen title="Get paid with card">
      {!conn ? (
        <>
          <p>Let clients pay invoices by card or Apple Pay. Invoice Jot adds a “Pay online” link to the invoice and PDF that opens a secure Stripe checkout page.</p>
          <ul className="benefits">
            <li>Money goes straight to your own Stripe account, then to your bank.</li>
            <li>Fees: Stripe’s standard card processing fee (charged by Stripe), plus a 1% Invoice Jot fee per card payment. No monthly fee; free and Pro both work.</li>
            <li>Not required: you can still paste your own payment link (PayPal, Square, Venmo) on any invoice.</li>
          </ul>
          <label className="field">
            <span className="field-label">Where is your business?</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              {CARD_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Btn onClick={() => void connect()} disabled={!!busy}>
            {busy === 'connect' ? 'Opening Stripe…' : 'Set up with Stripe'}
          </Btn>
          <p className="hint">
            Stripe asks for your business and bank details on its own secure page. Invoice Jot never sees them. To set this up, only your country and currency are sent to invoicejot.com and Stripe. Later, each card link sends the invoice amount, currency and number, never your client’s name, email or line items.{' '}
            <button className="link-btn" onClick={() => openExternal(PRIVACY_URL)}>
              Privacy Policy
            </button>
          </p>
        </>
      ) : (
        <>
          <div className="card">
            <div className="strong">{STATE_LABEL[conn.state]}</div>
            <div className="muted small">
              Stripe account {conn.accountId.slice(0, 9)}… · fee {conn.feeLabel} + Stripe processing
              {conn.checkedAt ? ` · checked ${new Date(conn.checkedAt).toLocaleString()}` : ''}
            </div>
          </div>
          {conn.state === 'active' ? (
            <p className="hint">Open an unpaid invoice and tap “Add card payment link”. After your client pays, tap “Check payment” to mark it paid.</p>
          ) : (
            <Btn onClick={() => void continueSetup()} disabled={!!busy}>
              {busy === 'link' ? 'Opening Stripe…' : 'Continue Stripe setup'}
            </Btn>
          )}
          <Btn kind="secondary" onClick={() => void refresh(conn)} disabled={!!busy}>
            {busy === 'status' ? 'Checking…' : 'Check status'}
          </Btn>
          <Btn kind="ghost" onClick={() => openExternal('https://dashboard.stripe.com/')}>
            Open Stripe Dashboard (payouts, refunds)
          </Btn>
          <Btn kind="danger" onClick={() => void disconnect()} disabled={!!busy}>
            Disconnect on this iPhone
          </Btn>
        </>
      )}
      {err ? (
        <p className="error" role="alert">
          {err}
        </p>
      ) : null}
    </Screen>
  );
}
