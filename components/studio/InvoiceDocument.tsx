import { lateFee } from '@/lib/studio-ops';
import { calcTotals, formatDate, formatMoney, lineTotal, termsLabel, type StudioInvoice } from '@/lib/studio';

/** Clean, print-ready invoice (always light themed; sized for US Letter / A4). */
export function InvoiceDocument({ invoice, today }: { invoice: StudioInvoice; today?: string }) {
  const b = invoice.business;
  const c = invoice.customer;
  const t = calcTotals(invoice);
  const money = (n: number) => formatMoney(n, b.currency);
  const accent = b.accentColor || '#4f6ef7';
  const isEstimate = invoice.kind === 'estimate';
  const isPaid = !isEstimate && (invoice.status === 'paid' || (t.total > 0 && t.balanceDue <= 0));
  const payUrl = !isEstimate && !isPaid ? invoice.paymentLink || b.paymentLinkUrl : '';
  const hasLateTerms = !isEstimate && invoice.applyLateFee && b.lateFeePercent > 0;
  const fee = today ? lateFee(invoice, today) : 0;
  const due = t.balanceDue + fee;
  const docWord = isEstimate ? 'Estimate' : 'Invoice';
  const showUnit = invoice.items.some((i) => i.unit);

  return (
    <article className="invoice-doc" style={{ ['--inv-accent' as string]: accent }}>
      <div className="inv-bar" />
      <header className="inv-header">
        <div className="inv-brand">
          {b.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logoDataUrl} alt={`${b.name} logo`} className="inv-logo" />
          ) : (
            <div className="inv-monogram">{(b.name || '?').trim().charAt(0).toUpperCase()}</div>
          )}
          <div>
            <h1 className="inv-bizname">{b.name}</h1>
            {b.tagline && <p className="inv-tagline">{b.tagline}</p>}
            <div className="inv-contact">
              {b.ownerName && <div>{b.ownerName}</div>}
              {b.address && b.address.split('\n').map((l, i) => <div key={i}>{l}</div>)}
              {b.phone && <div>{b.phone}</div>}
              {b.email && <div>{b.email}</div>}
              {b.website && <div>{b.website}</div>}
              {b.taxId && <div>Tax ID: {b.taxId}</div>}
            </div>
          </div>
        </div>
        <div className="inv-title-block">
          <h2 className="inv-title">{docWord.toUpperCase()}</h2>
          <div className="inv-number"># {invoice.number}</div>
          {isPaid && <div className="inv-paid">PAID</div>}
        </div>
      </header>

      <section className="inv-meta">
        <div>
          <div className="inv-label">Bill To</div>
          <div className="inv-billto-name">{c.name || '—'}</div>
          <div className="inv-contact">
            {c.company && <div>{c.company}</div>}
            {c.address && c.address.split('\n').map((l, i) => <div key={i}>{l}</div>)}
            {c.phone && <div>{c.phone}</div>}
            {c.email && <div>{c.email}</div>}
          </div>
        </div>
        <dl className="inv-dates">
          <div><dt>{docWord} Date</dt><dd>{formatDate(invoice.issueDate)}</dd></div>
          {!isEstimate && <div><dt>Terms</dt><dd>{termsLabel(invoice.termsDays)}{hasLateTerms ? ` · ${b.lateFeePercent}% late fee` : ''}</dd></div>}
          <div><dt>{isEstimate ? 'Valid Until' : 'Due Date'}</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
          {invoice.serviceDate && <div><dt>Service Date</dt><dd>{formatDate(invoice.serviceDate)}</dd></div>}
          {invoice.poNumber && <div><dt>PO / Job #</dt><dd>{invoice.poNumber}</dd></div>}
          <div className="inv-due-box"><dt>{isEstimate ? 'Estimate Total' : 'Balance Due'}</dt><dd>{money(isEstimate ? t.total : due)}</dd></div>
        </dl>
      </section>

      <table className="inv-table">
        <thead>
          <tr>
            <th className="inv-desc">Description</th>
            <th className="num">Qty</th>
            {showUnit && <th>Unit</th>}
            <th className="num">Rate</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td className="inv-desc">
                <div className="inv-item-name">{item.description || 'Item'}</div>
                {item.details && <div className="inv-item-details">{item.details}</div>}
              </td>
              <td className="num">{Number(item.quantity).toLocaleString('en-US')}</td>
              {showUnit && <td>{item.unit}</td>}
              <td className="num">{money(Number(item.unitPrice) || 0)}</td>
              <td className="num strong">{money(lineTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="inv-bottom">
        <div className="inv-notes">
          {payUrl && (
            <div>
              <div className="inv-label">Pay Online</div>
              <p><a className="inv-paylink" href={payUrl} target="_blank" rel="noreferrer">Pay {money(due)} securely online →</a></p>
            </div>
          )}
          {!isEstimate && invoice.payments.length > 0 && (
            <div>
              <div className="inv-label">Payment History</div>
              {invoice.payments.map((p) => (
                <p key={p.id}>{formatDate(p.date)} · {p.method}{p.reference ? ` #${p.reference}` : ''} · {money(p.amount)}</p>
              ))}
            </div>
          )}
          {!isEstimate && invoice.paymentInstructions && (
            <div>
              <div className="inv-label">Payment Instructions</div>
              <p>{invoice.paymentInstructions}</p>
            </div>
          )}
          {invoice.notes && (
            <div>
              <div className="inv-label">Notes</div>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>
        <dl className="inv-totals">
          <div><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
          {t.discount > 0 && (
            <div><dt>Discount{invoice.discountType === 'percent' ? ` (${invoice.discountValue}%)` : ''}</dt><dd>−{money(t.discount)}</dd></div>
          )}
          {invoice.taxRate > 0 && <div><dt>Tax ({invoice.taxRate}%)</dt><dd>{money(t.tax)}</dd></div>}
          {t.shipping > 0 && <div><dt>Shipping / Delivery</dt><dd>{money(t.shipping)}</dd></div>}
          <div className="inv-total"><dt>Total</dt><dd>{money(t.total)}</dd></div>
          {!isEstimate && t.amountPaid > 0 && <div><dt>Amount Paid</dt><dd>−{money(t.amountPaid)}</dd></div>}
          {fee > 0 && <div><dt>Late fee ({b.lateFeePercent}%)</dt><dd>{money(fee)}</dd></div>}
          {!isEstimate && <div className="inv-balance"><dt>Balance Due</dt><dd>{money(due)}</dd></div>}
        </dl>
      </section>

      <footer className="inv-footer">
        {b.name}{b.phone ? ` · ${b.phone}` : ''}{b.email ? ` · ${b.email}` : ''}
      </footer>
    </article>
  );
}
