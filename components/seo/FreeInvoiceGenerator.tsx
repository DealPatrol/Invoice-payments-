'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildDocPdf, pdfFileName } from '@/mobile/src/lib/pdf';
import { docTotals } from '@/mobile/src/lib/calc';
import { DEFAULT_BUSINESS, createDoc, emptyDatabase } from '@/mobile/src/lib/db';
import { addDays, todayISO } from '@/mobile/src/lib/util';
import type { Business, Doc, DocKind } from '@/mobile/src/lib/types';
import type { TradeLine } from '@/lib/seo/trades';

const KEY = 'invoicejot:web-generator';
const FOOTER = 'Made with Invoice Jot · invoicejot.com';

interface Line {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
}

interface State {
  kind: DocKind;
  number: string;
  issueDate: string;
  dueDate: string;
  business: Pick<Business, 'name' | 'email' | 'phone' | 'address' | 'paymentLink'>;
  client: { name: string; email: string; address: string };
  lines: Line[];
  taxRate: string;
  notes: string;
}

let n = 0;
const lid = () => `l${Date.now().toString(36)}${n++}`;

function initial(sample: TradeLine[] | null): State {
  const today = todayISO();
  return {
    kind: 'invoice',
    number: 'INV-0001',
    issueDate: today,
    dueDate: addDays(today, 14),
    business: { name: '', email: '', phone: '', address: '', paymentLink: '' },
    client: { name: '', email: '', address: '' },
    lines: (sample?.length ? sample : [{ name: '', qty: 1, unit: '', price: 0 }]).map((l) => ({ id: lid(), name: l.name, quantity: String(l.qty), unitPrice: l.price ? String(l.price) : '' })),
    taxRate: '0',
    notes: 'Thank you for your business!',
  };
}

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

export function FreeInvoiceGenerator({ sample }: { sample: TradeLine[] | null }) {
  const [s, setS] = useState<State>(() => initial(sample));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && !sample) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of the saved draft after hydration
        setS({ ...initial(null), ...(JSON.parse(raw) as Partial<State>) });
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [sample]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s, loaded]);

  const doc: Doc = useMemo(() => {
    const base = createDoc(emptyDatabase(), s.kind, s.issueDate).doc;
    return {
      ...base,
      number: s.number || base.number,
      issueDate: s.issueDate,
      dueDate: s.dueDate,
      clientSnapshot: { name: s.client.name, email: s.client.email, phone: '', address: s.client.address },
      lines: s.lines.map((l) => ({ id: l.id, name: l.name, description: '', quantity: num(l.quantity), unitPrice: num(l.unitPrice), taxable: true })),
      taxRate: num(s.taxRate),
      notes: s.notes,
    };
  }, [s]);
  const totals = docTotals(doc);
  const business: Business = { ...DEFAULT_BUSINESS, ...s.business };

  const download = () => {
    const pdf = buildDocPdf({ doc, business, footer: FOOTER });
    pdf.save(pdfFileName(doc));
  };

  const setLine = (id: string, patch: Partial<Line>) => setS((x) => ({ ...x, lines: x.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  const money = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div className="gen">
      <div>
        <h2 style={{ fontSize: 22 }}>Your business</h2>
        <label>
          Business name
          <input value={s.business.name} onChange={(e) => setS({ ...s, business: { ...s.business, name: e.target.value } })} autoComplete="organization" />
        </label>
        <div className="row2">
          <label>
            Email
            <input type="email" value={s.business.email} onChange={(e) => setS({ ...s, business: { ...s.business, email: e.target.value } })} />
          </label>
          <label>
            Phone
            <input type="tel" value={s.business.phone} onChange={(e) => setS({ ...s, business: { ...s.business, phone: e.target.value } })} />
          </label>
        </div>
        <label>
          Address
          <textarea rows={2} value={s.business.address} onChange={(e) => setS({ ...s, business: { ...s.business, address: e.target.value } })} />
        </label>
        <label>
          Payment link (optional: your Stripe, Square, PayPal or Venmo link)
          <input type="url" value={s.business.paymentLink} onChange={(e) => setS({ ...s, business: { ...s.business, paymentLink: e.target.value } })} />
        </label>

        <h2 style={{ fontSize: 22 }}>Bill to</h2>
        <div className="row2">
          <label>
            Client name
            <input value={s.client.name} onChange={(e) => setS({ ...s, client: { ...s.client, name: e.target.value } })} />
          </label>
          <label>
            Client email
            <input type="email" value={s.client.email} onChange={(e) => setS({ ...s, client: { ...s.client, email: e.target.value } })} />
          </label>
        </div>
        <label>
          Client address
          <textarea rows={2} value={s.client.address} onChange={(e) => setS({ ...s, client: { ...s.client, address: e.target.value } })} />
        </label>
      </div>

      <div>
        <h2 style={{ fontSize: 22 }}>Details</h2>
        <div className="row2">
          <label>
            Document
            <select value={s.kind} onChange={(e) => setS({ ...s, kind: e.target.value === 'estimate' ? 'estimate' : 'invoice', number: e.target.value === 'estimate' ? 'EST-0001' : 'INV-0001' })}>
              <option value="invoice">Invoice</option>
              <option value="estimate">Estimate</option>
            </select>
          </label>
          <label>
            Number
            <input value={s.number} onChange={(e) => setS({ ...s, number: e.target.value })} />
          </label>
        </div>
        <div className="row2">
          <label>
            Date
            <input type="date" value={s.issueDate} onChange={(e) => setS({ ...s, issueDate: e.target.value })} />
          </label>
          <label>
            {s.kind === 'invoice' ? 'Due date' : 'Valid until'}
            <input type="date" value={s.dueDate} onChange={(e) => setS({ ...s, dueDate: e.target.value })} />
          </label>
        </div>

        <h2 style={{ fontSize: 22 }}>Line items</h2>
        {s.lines.map((l, i) => (
          <div className="row3" key={l.id}>
            <label>
              Item {i + 1}
              <input value={l.name} onChange={(e) => setLine(l.id, { name: e.target.value })} />
            </label>
            <label>
              Qty
              <input inputMode="decimal" aria-label={`Item ${i + 1} quantity`} value={l.quantity} onChange={(e) => setLine(l.id, { quantity: e.target.value })} />
            </label>
            <label>
              Rate
              <input inputMode="decimal" aria-label={`Item ${i + 1} rate`} value={l.unitPrice} onChange={(e) => setLine(l.id, { unitPrice: e.target.value })} />
            </label>
            <button className="x" type="button" aria-label={`Remove item ${i + 1}`} onClick={() => setS({ ...s, lines: s.lines.filter((x) => x.id !== l.id) })}>
              ×
            </button>
          </div>
        ))}
        <button className="btn ghost small" type="button" onClick={() => setS({ ...s, lines: [...s.lines, { id: lid(), name: '', quantity: '1', unitPrice: '' }] })}>
          + Add line
        </button>
        <div className="row2" style={{ marginTop: 12 }}>
          <label>
            Tax rate %
            <input inputMode="decimal" value={s.taxRate} onChange={(e) => setS({ ...s, taxRate: e.target.value })} />
          </label>
        </div>
        <label>
          Notes
          <textarea rows={2} value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} />
        </label>
        <div className="card" aria-live="polite">
          <div className="line">
            <span>Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          <div className="line">
            <span>Tax</span>
            <span>{money(totals.tax)}</span>
          </div>
          <div className="line">
            <b>Total</b>
            <b>{money(totals.total)}</b>
          </div>
          <button className="btn" type="button" style={{ width: '100%', marginTop: 14 }} onClick={download}>
            Download PDF
          </button>
          <p className="fine">Free, no sign-up. Your entries are saved in this browser only and never sent to a server.</p>
        </div>
      </div>
    </div>
  );
}
