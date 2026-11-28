import { useState } from 'react';
import { useApp } from '../store';
import { Btn, Field } from '../ui';
import { FALLBACK_PRICES, PRO_MONTHLY_ID, PRO_YEARLY_ID } from '../lib/config';
import { FREE_INVOICE_SENDS } from '../lib/gate';

export function Onboarding() {
  const { db, update } = useApp();
  const [name, setName] = useState(db.business.name);
  const [email, setEmail] = useState(db.business.email);
  const [phone, setPhone] = useState(db.business.phone);
  const finish = () => update((d) => ({ ...d, onboarded: true, business: { ...d.business, name: name.trim(), email: email.trim(), phone: phone.trim() } }));
  return (
    <main className="onboarding">
      <img src="icon.png" alt="" className="onb-icon" width={88} height={88} />
      <h1>Invoice Jot</h1>
      <p className="lead">Make an invoice or estimate in a minute and get paid. No account, no sign-up — everything stays on this iPhone.</p>
      <Field label="Business name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rivera Plumbing" autoComplete="organization" />
      <Field label="Email (shown on your invoices)" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Field label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      <p className="fine" data-testid="plan-disclosure">
        Free plan: unlimited drafts, estimates, clients and receipts, plus your first {FREE_INVOICE_SENDS} invoice sends. After that, sending new invoices needs Invoice Jot Pro ({FALLBACK_PRICES[PRO_MONTHLY_ID]}/month or {FALLBACK_PRICES[PRO_YEARLY_ID]}/year, no free trial). Everything you have already sent stays free to view and share, and you can back up all of it any time.
      </p>
      <Btn onClick={finish}>Start invoicing</Btn>
      <button className="link-btn" onClick={() => update((d) => ({ ...d, onboarded: true }))}>
        Skip for now
      </button>
    </main>
  );
}
