import { useState } from 'react';
import { useApp } from '../store';
import { Btn, Field } from '../ui';

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
      <Btn onClick={finish}>Start invoicing</Btn>
      <button className="link-btn" onClick={() => update((d) => ({ ...d, onboarded: true }))}>
        Skip for now
      </button>
    </main>
  );
}
