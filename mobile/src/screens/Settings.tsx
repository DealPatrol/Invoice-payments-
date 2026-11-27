import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Area, Btn, Field, Screen } from '../ui';
import type { Business, PdfStyle } from '../lib/types';
import { emptyDatabase } from '../lib/db';
import { num, todayISO } from '../lib/util';
import { backupFileName, backupJson, clientsCsv, documentsCsv, parseBackup, paymentsCsv } from '../lib/exporters';
import { fileToDataUrl, openExternal, shareFile } from '../lib/native';
import { InvoiceJotStore, restorePro } from '../lib/storekit';
import { PRIVACY_URL, SITE_URL, SUPPORT_EMAIL, TERMS_URL } from '../lib/config';
import { isNative } from '../lib/platform';

const CURRENCIES = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'NZD', 'MXN', 'ZAR', 'INR'];
const STYLES: { id: PdfStyle; label: string }[] = [
  { id: 'modern', label: 'Modern' },
  { id: 'classic', label: 'Classic' },
  { id: 'bold', label: 'Bold' },
];
const ACCENTS = ['#1f6f5c', '#1d4ed8', '#b45309', '#be123c', '#334155', '#7c3aed'];

export function Settings() {
  const { db, update, replace, pro, setPro, openPaywall, toast } = useApp();
  const [b, setB] = useState<Business>(db.business);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (JSON.stringify(b) !== JSON.stringify(db.business)) update((d) => ({ ...d, business: b }));
    }, 400);
    return () => window.clearTimeout(t);
  }, [b, db.business, update]);

  const set = (patch: Partial<Business>) => setB((x) => ({ ...x, ...patch }));

  const exportText = async (name: string, text: string, mime: string, title: string) => {
    try {
      if (await shareFile(name, { text }, mime, title)) toast('Exported');
    } catch (e) {
      toast(`Export failed: ${String((e as Error)?.message ?? e)}`);
    }
  };

  const restoreBackup = async (file: File) => {
    try {
      const next = parseBackup(await file.text());
      if (!window.confirm(`Replace everything on this iPhone with this backup (${next.docs.length} documents, ${next.clients.length} clients)?`)) return;
      await replace(next);
      setB(next.business);
      toast('Backup restored');
    } catch (e) {
      toast(String((e as Error)?.message ?? e));
    }
  };

  const eraseAll = async () => {
    if (!window.confirm('Delete ALL invoices, estimates, clients, items and receipts from this iPhone? Export a backup first if you might need them.')) return;
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    const fresh = emptyDatabase();
    await replace(fresh);
    setB(fresh.business);
    toast('All data deleted');
  };

  return (
    <Screen title="Settings">
      <h2 className="section">Your business</h2>
      <div className="logo-row">
        {b.logo ? <img src={b.logo} alt="Your logo" className="logo-preview" /> : <span className="logo-preview logo-empty">Logo</span>}
        <label className="btn btn-secondary file-btn">
          {b.logo ? 'Change logo' : 'Add logo'}
          <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ logo: await fileToDataUrl(f, 500, 'image/png') }); }} />
        </label>
        {b.logo ? <button className="link-btn danger" onClick={() => set({ logo: '' })}>Remove</button> : null}
      </div>
      <Field label="Business name" value={b.name} onChange={(e) => set({ name: e.target.value })} />
      <Field label="Your name" value={b.owner} onChange={(e) => set({ owner: e.target.value })} />
      <Field label="Email" type="email" value={b.email} onChange={(e) => set({ email: e.target.value })} />
      <Field label="Phone" type="tel" value={b.phone} onChange={(e) => set({ phone: e.target.value })} />
      <Area label="Address" value={b.address} onChange={(e) => set({ address: e.target.value })} />
      <Field label="Website" type="url" value={b.website} onChange={(e) => set({ website: e.target.value })} />
      <Field label="Tax ID / license # (optional)" value={b.taxId} onChange={(e) => set({ taxId: e.target.value })} />

      <h2 className="section">Getting paid</h2>
      <Field label="Default payment link" type="url" inputMode="url" placeholder="https://buy.stripe.com/… or paypal.me/…" value={b.paymentLink} onChange={(e) => set({ paymentLink: e.target.value })} hint="Printed as a tappable “Pay online” link on every invoice. Use your own Stripe, Square, PayPal or Venmo link — clients pay you directly." />
      <Area label="Other payment instructions" value={b.paymentInstructions} onChange={(e) => set({ paymentInstructions: e.target.value })} placeholder="Checks payable to… / Zelle to…" />

      <h2 className="section">Defaults</h2>
      <div className="two">
        <label className="field">
          <span className="field-label">Currency</span>
          <select value={b.currency} onChange={(e) => set({ currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <Field label="Tax rate %" type="number" inputMode="decimal" step="any" value={String(b.defaultTaxRate)} onChange={(e) => set({ defaultTaxRate: num(e.target.value) })} />
      </div>
      <Field label="Payment due in (days)" type="number" inputMode="numeric" value={String(b.defaultTermsDays)} onChange={(e) => set({ defaultTermsDays: Math.max(0, Math.round(num(e.target.value))) })} />
      <Area label="Default note on new documents" value={b.defaultNotes} onChange={(e) => set({ defaultNotes: e.target.value })} placeholder="Thank you for your business!" />

      <h2 className="section">PDF look</h2>
      <div className="chips" role="radiogroup" aria-label="PDF style">
        {STYLES.map((s) => (
          <button key={s.id} role="radio" aria-checked={b.pdfStyle === s.id} className={`chip ${b.pdfStyle === s.id ? 'on' : ''}`} onClick={() => set({ pdfStyle: s.id })}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label="Brand color">
        {ACCENTS.map((c) => (
          <button key={c} role="radio" aria-checked={b.accent === c} aria-label={`Color ${c}`} className={`swatch ${b.accent === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ accent: c })} />
        ))}
      </div>

      <h2 className="section">Invoice Jot Pro</h2>
      {pro ? (
        <p>Pro is active. Thank you!</p>
      ) : (
        <Btn onClick={() => openPaywall('')}>See Pro plans</Btn>
      )}
      <Btn kind="ghost" onClick={async () => { const r = await restorePro(); setPro(r.pro); toast(r.pro ? 'Purchases restored' : 'No active subscription found'); }}>
        Restore Purchases
      </Btn>
      {isNative() ? (
        <Btn kind="ghost" onClick={() => void InvoiceJotStore.manageSubscriptions()}>
          Manage subscription
        </Btn>
      ) : null}

      <h2 className="section">Your data (always free)</h2>
      <p className="muted small">Everything is stored only on this iPhone. Export anytime with “Save to Files”, AirDrop or email.</p>
      <Btn kind="secondary" onClick={() => void exportText(backupFileName(), backupJson(db), 'application/json', 'Back up Invoice Jot')}>
        Back up everything (JSON)
      </Btn>
      <label className="btn btn-ghost file-btn">
        Restore from backup
        <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void restoreBackup(f); e.target.value = ''; }} />
      </label>
      <div className="two">
        <Btn kind="ghost" onClick={() => void exportText(`InvoiceJot-documents-${todayISO()}.csv`, documentsCsv(db), 'text/csv', 'Export documents')}>
          Documents CSV
        </Btn>
        <Btn kind="ghost" onClick={() => void exportText(`InvoiceJot-payments-${todayISO()}.csv`, paymentsCsv(db), 'text/csv', 'Export payments')}>
          Payments CSV
        </Btn>
      </div>
      <Btn kind="ghost" onClick={() => void exportText(`InvoiceJot-clients-${todayISO()}.csv`, clientsCsv(db), 'text/csv', 'Export clients')}>
        Clients CSV
      </Btn>

      <h2 className="section">Help & legal</h2>
      <Btn kind="ghost" onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}?subject=Invoice%20Jot%20support`)}>
        Email support
      </Btn>
      <div className="two">
        <Btn kind="ghost" onClick={() => openExternal(PRIVACY_URL)}>
          Privacy
        </Btn>
        <Btn kind="ghost" onClick={() => openExternal(TERMS_URL)}>
          Terms
        </Btn>
      </div>
      <Btn kind="ghost" onClick={() => openExternal(`${SITE_URL}/templates`)}>
        Invoice templates by trade
      </Btn>
      <Btn kind="danger" onClick={() => void eraseAll()}>
        Delete all data on this iPhone
      </Btn>
      <p className="fine center">Invoice Jot · no account · data stays on your device</p>
    </Screen>
  );
}
