import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Btn } from '../ui';
import type { Doc } from '../lib/types';
import { saveDoc } from '../lib/db';
import { docTotals } from '../lib/calc';
import { formatMoney } from '../lib/util';
import { success } from '../lib/native';
import { applyCardStatus, cardApi, cardLinkIsCurrent, cardLinkToken, cardPaidOn, fromMinor, loadConnection, newPaymentRef, readPayLink, type CardConnection } from '../lib/cardPayments';

const api = cardApi();

/** On an unpaid invoice: add/refresh the Stripe "Pay online" link and check whether the client paid. */
export function CardPaySection({ doc, cur }: { doc: Doc; cur: string }) {
  const { update, go, toast } = useApp();
  const [conn, setConn] = useState<CardConnection | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void loadConnection().then(setConn);
  }, []);
  if (doc.kind !== 'invoice' || conn === undefined) return null;

  const token = cardLinkToken(doc.paymentLink);
  const info = readPayLink(doc.paymentLink);
  const balance = docTotals(doc).balance;
  const current = cardLinkIsCurrent(doc, cur, conn);

  if (!conn) {
    if (token) return null; // link from a previous connection; leave it alone
    return (
      <p className="hint center">
        Want clients to pay by card?{' '}
        <button className="link-btn" onClick={() => go({ name: 'getpaid' })}>
          Set up card payments
        </button>
      </p>
    );
  }

  const makeLink = async () => {
    setErr(null);
    setBusy('link');
    try {
      // Amount = what is still owed, plus card payments already counted (the server subtracts those).
      const amount = Math.round((balance + cardPaidOn(doc)) * 100) / 100;
      const r = await api.payLink(conn, { amount, currency: cur, invoiceNumber: doc.number, ref: info?.ref ?? newPaymentRef() });
      update((d) => saveDoc(d, { ...doc, paymentLink: r.url }));
      success();
      toast('“Pay online” card link added to this invoice and its PDF');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    if (!token) return;
    setErr(null);
    setBusy('check');
    try {
      const s = await api.invoiceStatus(conn, token);
      let added = 0;
      let fully = false;
      update((d) => {
        const r = applyCardStatus(d, doc.id, s.amountPaid, s.paidAt);
        added = r.added;
        fully = r.fullyPaid;
        return r.db;
      });
      if (added > 0) {
        success();
        toast(fully ? `Paid by card: ${formatMoney(added, cur)}. Marked paid.` : `Card payment recorded: ${formatMoney(added, cur)}`);
      } else toast(s.processing ? 'A card payment is processing. Check again later.' : 'No new card payment yet.');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card">
      <strong>Card payment (Stripe)</strong>
      {conn.state !== 'active' && conn.state !== 'unknown' ? (
        <p className="hint">
          Finish Stripe setup first.{' '}
          <button className="link-btn" onClick={() => go({ name: 'getpaid' })}>
            Open Get paid with card
          </button>
        </p>
      ) : null}
      {token && !current && balance > 0 ? <p className="hint">The amount owed changed since the card link was made. Update it before sending the PDF again.</p> : null}
      {token && current ? <p className="hint">“Pay online” on this invoice and its PDF opens Stripe checkout for {info ? formatMoney(fromMinor(info.amountMinor, info.currency), cur) : 'the balance'}.</p> : null}
      {balance > 0 && (!token || !current) ? (
        <Btn kind="secondary" onClick={() => void makeLink()} disabled={!!busy || balance <= 0}>
          {busy === 'link' ? 'Making link…' : token ? 'Update card payment link' : 'Add card payment link'}
        </Btn>
      ) : null}
      {token ? (
        <Btn kind="ghost" onClick={() => void check()} disabled={!!busy}>
          {busy === 'check' ? 'Checking Stripe…' : 'Check payment'}
        </Btn>
      ) : null}
      {err ? (
        <p className="error" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
