import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { Area, Btn, Empty, Field, Screen, StatusPill } from '../ui';
import type { Doc, LineItem } from '../lib/types';
import { convertEstimate, deleteDoc, duplicateDoc, markSent, recordPayment, rememberItems, saveDoc, upsertClient } from '../lib/db';
import { displayStatus, docTotals, lineTotal } from '../lib/calc';
import { formatDate, formatMoney, num, uid } from '../lib/util';
import { canSendDoc, pdfFooter, postSendNotice, preSendNotice, shouldAskForReview } from '../lib/gate';
import { docPdfBase64, pdfFileName } from '../lib/pdf';
import { requestAppReview, shareFile, shareText, success, tap } from '../lib/native';
import { canRemind, reminderText } from '../lib/reminder';
import { CardPaySection } from './CardPaySection';

const ASKED_KEY = 'invoicejot:review-asked';

function askedList(): number[] {
  try {
    return JSON.parse(localStorage.getItem(ASKED_KEY) || '[]') as number[];
  } catch {
    return [];
  }
}

export function DocScreen({ id }: { id: string }) {
  const { db, update, go, back, pro, openPaywall, toast } = useApp();
  const stored = db.docs.find((d) => d.id === id);
  // `draft` is the edit buffer; null means we are viewing the saved document.
  const [draft, setDraft] = useState<Doc | null>(() => (stored && stored.status === 'draft' && stored.lines.length === 0 ? stored : null));
  const editing = draft !== null;
  const doc = draft ?? stored ?? null;
  const setDoc = setDraft;
  const setEditing = (on: boolean) => setDraft(on && stored ? stored : null);
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  // Autosave while editing, so nothing is ever lost.
  useEffect(() => {
    if (!draft) return;
    const t = window.setTimeout(() => update((d) => saveDoc(d, draft)), 400);
    return () => window.clearTimeout(t);
  }, [draft, update]);

  const totals = useMemo(() => (doc ? docTotals(doc) : null), [doc]);
  if (!doc || !totals) return <Screen title="Not found"><Empty title="This document was deleted" body="Go back to see your other documents." /></Screen>;

  const cur = db.business.currency;
  const isInvoice = doc.kind === 'invoice';
  const status = displayStatus(doc);
  const set = (patch: Partial<Doc>) => setDoc((d) => (d ? { ...d, ...patch } : d));
  const setLine = (lid: string, patch: Partial<LineItem>) => set({ lines: doc.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) });
  const addLine = (preset?: Partial<LineItem>) =>
    set({ lines: [...doc.lines, { id: uid('li_'), name: '', description: '', quantity: 1, unitPrice: 0, taxable: true, ...preset }] });

  const finishEditing = () => {
    if (draft) update((d) => rememberItems(saveDoc(d, draft), draft.lines));
    setDraft(null);
    tap();
  };

  const pickClient = (clientId: string) => {
    const c = db.clients.find((x) => x.id === clientId);
    if (c) set({ clientId: c.id, clientSnapshot: { name: c.name, email: c.email, phone: c.phone, address: c.address } });
  };

  const saveNewClient = () => {
    const snap = doc.clientSnapshot;
    if (!snap?.name.trim()) return;
    let cid = '';
    update((d) => {
      const r = upsertClient(d, { ...snap, id: doc.clientId ?? undefined });
      cid = r.client.id;
      return r.db;
    });
    set({ clientId: cid });
    toast('Client saved');
  };

  const sendPdf = async () => {
    if (editing) finishEditing();
    if (!canSendDoc(db, doc, pro)) {
      openPaywall('You have used your 3 free invoice sends. Pro unlocks unlimited sends. Drafts, estimates and every past invoice stay free to view and export.');
      return;
    }
    setBusy(true);
    try {
      const base64 = docPdfBase64({ doc, business: db.business, footer: pdfFooter(pro), pro });
      const shared = await shareFile(pdfFileName(doc), { base64 }, 'application/pdf', `Send ${doc.number}`);
      if (shared) {
        const wasNew = isInvoice && !db.sentInvoiceIds.includes(doc.id);
        const after = markSent(db, doc.id);
        update((d) => markSent(d, doc.id));
        success();
        toast(postSendNotice(after, pro, wasNew) || (isInvoice ? 'Invoice ready to send' : 'Estimate ready to send'));
      }
    } catch (e) {
      toast(`Could not create the PDF: ${String((e as Error)?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (amount?: number) => {
    let fully = false;
    let paidCount = db.paidCount;
    update((d) => {
      const r = recordPayment(d, doc.id, amount, 'Recorded');
      fully = r.fullyPaid;
      paidCount = r.db.paidCount;
      return r.db;
    });
    setPayAmount('');
    success();
    toast(fully ? 'Marked paid. Nice work!' : 'Payment recorded');
    if (fully) {
      const asked = askedList();
      if (shouldAskForReview(paidCount, asked)) {
        localStorage.setItem(ASKED_KEY, JSON.stringify([...asked, paidCount]));
        window.setTimeout(() => void requestAppReview(), 900);
      }
    }
  };

  const sendReminder = async () => {
    try {
      if (await shareText(reminderText(doc, db.business), `Reminder for ${doc.number}`)) toast('Reminder ready to send');
    } catch (e) {
      toast(`Could not open the share sheet: ${String((e as Error)?.message ?? e)}`);
    }
  };

  const convert = () => {
    let invId = '';
    update((d) => {
      const r = convertEstimate(d, doc.id);
      invId = r?.invoice.id ?? '';
      return r?.db ?? d;
    });
    if (invId) {
      toast('Converted to an invoice');
      go({ name: 'doc', id: invId });
    }
  };

  const duplicate = () => {
    let nid = '';
    update((d) => {
      const r = duplicateDoc(d, doc.id);
      nid = r?.doc.id ?? '';
      return r?.db ?? d;
    });
    if (nid) go({ name: 'doc', id: nid });
  };

  const remove = () => {
    if (!window.confirm(`Delete ${doc.number}? This cannot be undone.`)) return;
    update((d) => deleteDoc(d, doc.id));
    back();
  };

  const title = `${isInvoice ? 'Invoice' : 'Estimate'} ${doc.number}`;

  if (editing) {
    return (
      <Screen title={title} action={<button className="link-btn strong" onClick={finishEditing}>Done</button>}>
        <h2 className="section">Client</h2>
        {db.clients.length > 0 ? (
          <label className="field">
            <span className="field-label">Choose a saved client</span>
            <select value={doc.clientId ?? ''} onChange={(e) => pickClient(e.target.value)}>
              <option value="">— New or one-off client —</option>
              {db.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Field label="Client name" value={doc.clientSnapshot?.name ?? ''} onChange={(e) => set({ clientSnapshot: { name: e.target.value, email: doc.clientSnapshot?.email ?? '', phone: doc.clientSnapshot?.phone ?? '', address: doc.clientSnapshot?.address ?? '' } })} autoComplete="off" />
        <Field label="Email" type="email" inputMode="email" value={doc.clientSnapshot?.email ?? ''} onChange={(e) => set({ clientSnapshot: { ...(doc.clientSnapshot ?? { name: '', phone: '', address: '' }), email: e.target.value } })} />
        <Field label="Phone" type="tel" value={doc.clientSnapshot?.phone ?? ''} onChange={(e) => set({ clientSnapshot: { ...(doc.clientSnapshot ?? { name: '', email: '', address: '' }), phone: e.target.value } })} />
        <Area label="Address" value={doc.clientSnapshot?.address ?? ''} onChange={(e) => set({ clientSnapshot: { ...(doc.clientSnapshot ?? { name: '', email: '', phone: '' }), address: e.target.value } })} />
        {doc.clientSnapshot?.name && !doc.clientId ? (
          <Btn kind="ghost" onClick={saveNewClient}>
            Save to clients
          </Btn>
        ) : null}

        <h2 className="section">Details</h2>
        <Field label="Job or project (optional)" value={doc.title} onChange={(e) => set({ title: e.target.value })} placeholder="Kitchen faucet replacement" />
        <div className="two">
          <Field label="Date" type="date" value={doc.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
          <Field label={isInvoice ? 'Due' : 'Valid until'} type="date" value={doc.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
        </div>

        <h2 className="section">Line items</h2>
        <datalist id="saved-items">
          {db.items.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
        {doc.lines.map((l, i) => (
          <div className="line-edit" key={l.id}>
            <Field
              label={`Item ${i + 1}`}
              list="saved-items"
              value={l.name}
              placeholder="Labor, part, service…"
              onChange={(e) => {
                const name = e.target.value;
                const saved = db.items.find((s) => s.name.toLowerCase() === name.toLowerCase());
                setLine(l.id, saved && l.unitPrice === 0 ? { name: saved.name, unitPrice: saved.unitPrice, description: saved.description, taxable: saved.taxable } : { name });
              }}
            />
            <Field label="Description (optional)" aria-label={`Item ${i + 1} description`} value={l.description} onChange={(e) => setLine(l.id, { description: e.target.value })} />
            <div className="three">
              <Field label="Qty" aria-label={`Item ${i + 1} quantity`} type="number" inputMode="decimal" step="any" value={String(l.quantity)} onChange={(e) => setLine(l.id, { quantity: num(e.target.value) })} />
              <Field label="Rate" aria-label={`Item ${i + 1} rate`} type="number" inputMode="decimal" step="any" value={String(l.unitPrice)} onChange={(e) => setLine(l.id, { unitPrice: num(e.target.value) })} />
              <div className="field">
                <span className="field-label">Amount</span>
                <span className="amount">{formatMoney(lineTotal(l), cur)}</span>
              </div>
            </div>
            <div className="row">
              <label className="check">
                <input type="checkbox" checked={l.taxable} onChange={(e) => setLine(l.id, { taxable: e.target.checked })} /> Taxable
              </label>
              <button className="link-btn danger" onClick={() => set({ lines: doc.lines.filter((x) => x.id !== l.id) })} aria-label={`Remove item ${i + 1}`}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <Btn kind="secondary" onClick={() => addLine()}>
          + Add line item
        </Btn>
        {db.items.length > 0 ? (
          <div className="chips" aria-label="Quick add saved items">
            {db.items.slice(0, 8).map((it) => (
              <button key={it.id} className="chip" onClick={() => addLine({ name: it.name, description: it.description, unitPrice: it.unitPrice, taxable: it.taxable })}>
                + {it.name}
              </button>
            ))}
          </div>
        ) : null}

        <h2 className="section">Tax, discount & deposit</h2>
        <div className="two">
          <Field label="Tax rate %" type="number" inputMode="decimal" step="any" value={String(doc.taxRate)} onChange={(e) => set({ taxRate: num(e.target.value) })} />
          <Field label="Deposit requested" type="number" inputMode="decimal" step="any" value={String(doc.deposit)} onChange={(e) => set({ deposit: num(e.target.value) })} />
        </div>
        <div className="two">
          <Field label="Discount" type="number" inputMode="decimal" step="any" value={String(doc.discountValue)} onChange={(e) => set({ discountValue: num(e.target.value) })} />
          <label className="field">
            <span className="field-label">Discount type</span>
            <select value={doc.discountType} onChange={(e) => set({ discountType: e.target.value === 'amount' ? 'amount' : 'percent' })}>
              <option value="percent">Percent %</option>
              <option value="amount">Amount</option>
            </select>
          </label>
        </div>

        <h2 className="section">Getting paid</h2>
        <Field label="Payment link for this document (optional)" type="url" inputMode="url" placeholder={db.business.paymentLink || 'https://buy.stripe.com/…'} value={doc.paymentLink} onChange={(e) => set({ paymentLink: e.target.value })} hint="Your own Stripe, Square, PayPal or Venmo link. Leave blank to use the default from Settings." />
        <Area label="Notes to client" value={doc.notes} onChange={(e) => set({ notes: e.target.value })} />
        <Area label="Terms" value={doc.terms} onChange={(e) => set({ terms: e.target.value })} />

        <Totals doc={doc} cur={cur} />
        <Btn onClick={finishEditing}>Save</Btn>
      </Screen>
    );
  }

  const sendLabel = isInvoice ? (db.sentInvoiceIds.includes(doc.id) ? 'Share PDF again' : 'Send invoice PDF') : 'Send estimate PDF';
  const lockHint = preSendNotice(db, doc, pro);

  return (
    <Screen title={title} action={<button className="link-btn" onClick={() => setEditing(true)}>Edit</button>}>
      <div className="doc-head">
        <div>
          <div className="strong big">{doc.clientSnapshot?.name || 'No client yet'}</div>
          <div className="muted small">
            {formatDate(doc.issueDate)} · {isInvoice ? 'Due' : 'Valid until'} {formatDate(doc.dueDate)}
          </div>
          {doc.title ? <div className="small">{doc.title}</div> : null}
        </div>
        <StatusPill s={status} />
      </div>

      <ul className="lines" aria-label="Line items">
        {doc.lines.length === 0 ? <li className="muted">No line items yet. Tap Edit to add some.</li> : null}
        {doc.lines.map((l) => (
          <li key={l.id} className="row">
            <div>
              <div>{l.name || 'Item'}</div>
              <div className="muted small">
                {l.quantity} × {formatMoney(l.unitPrice, cur)}
                {l.description ? ` · ${l.description}` : ''}
              </div>
            </div>
            <div className="strong">{formatMoney(lineTotal(l), cur)}</div>
          </li>
        ))}
      </ul>
      <Totals doc={doc} cur={cur} />

      <div className="actions">
        <Btn onClick={sendPdf} disabled={busy || doc.lines.length === 0}>
          {busy ? 'Making PDF…' : sendLabel}
        </Btn>
        {lockHint ? <p className="hint center">{lockHint}</p> : null}

        {isInvoice && status !== 'paid' ? <CardPaySection doc={doc} cur={cur} /> : null}

        {isInvoice && status !== 'paid' ? (
          <>
            <Btn kind="secondary" onClick={() => void markPaid()} disabled={totals.balance <= 0}>
              Mark paid ({formatMoney(totals.balance, cur)})
            </Btn>
            <div className="two">
              <Field label="Partial payment" type="number" inputMode="decimal" step="any" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              <Btn kind="ghost" onClick={() => num(payAmount) > 0 && void markPaid(num(payAmount))} disabled={num(payAmount) <= 0}>
                Record
              </Btn>
            </div>
          </>
        ) : null}

        {canRemind(doc) ? (
          <Btn kind="ghost" onClick={() => void sendReminder()}>
            Send a payment reminder (free)
          </Btn>
        ) : null}

        {!isInvoice ? (
          <>
            <Btn kind="secondary" onClick={convert}>
              {doc.linkedDocId ? 'Open the invoice' : 'Convert to invoice'}
            </Btn>
            {doc.status !== 'declined' && !doc.linkedDocId ? (
              <Btn kind="ghost" onClick={() => update((d) => saveDoc(d, { ...doc, status: 'declined' }))}>
                Mark declined
              </Btn>
            ) : null}
          </>
        ) : null}
        {doc.linkedDocId && isInvoice ? (
          <Btn kind="ghost" onClick={() => go({ name: 'doc', id: doc.linkedDocId as string })}>
            View original estimate
          </Btn>
        ) : null}

        {doc.payments.length > 0 ? (
          <div className="card">
            <strong>Payments</strong>
            <ul className="plain">
              {doc.payments.map((p) => (
                <li key={p.id} className="row">
                  <span>{formatDate(p.date)}</span>
                  <span>{formatMoney(p.amount, cur)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="two">
          <Btn kind="ghost" onClick={duplicate}>
            Duplicate
          </Btn>
          <Btn kind="danger" onClick={remove}>
            Delete
          </Btn>
        </div>
      </div>
    </Screen>
  );
}

function Totals({ doc, cur }: { doc: Doc; cur: string }) {
  const t = docTotals(doc);
  return (
    <dl className="totals">
      <div className="row">
        <dt>Subtotal</dt>
        <dd>{formatMoney(t.subtotal, cur)}</dd>
      </div>
      {t.discount > 0 ? (
        <div className="row">
          <dt>Discount</dt>
          <dd>−{formatMoney(t.discount, cur)}</dd>
        </div>
      ) : null}
      {doc.taxRate > 0 ? (
        <div className="row">
          <dt>Tax ({doc.taxRate}%)</dt>
          <dd>{formatMoney(t.tax, cur)}</dd>
        </div>
      ) : null}
      <div className="row strong big">
        <dt>Total</dt>
        <dd>{formatMoney(t.total, cur)}</dd>
      </div>
      {t.paid > 0 ? (
        <div className="row">
          <dt>Paid</dt>
          <dd>−{formatMoney(t.paid, cur)}</dd>
        </div>
      ) : null}
      {doc.kind === 'invoice' ? (
        <div className="row strong">
          <dt>Balance due</dt>
          <dd>{formatMoney(t.balance, cur)}</dd>
        </div>
      ) : null}
      {t.deposit > 0 ? (
        <div className="row">
          <dt>Deposit</dt>
          <dd>{formatMoney(t.deposit, cur)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
