import { useApp } from '../store';
import { Btn, Card, Screen, StatusPill } from '../ui';
import { createDoc } from '../lib/db';
import { displayStatus, docTotals, summarize } from '../lib/calc';
import { formatDate, formatMoney } from '../lib/util';
import { FREE_INVOICE_SENDS, freeSendsLeft } from '../lib/gate';

export function Home() {
  const { db, update, go, pro, openPaywall } = useApp();
  const s = summarize(db.docs);
  const cur = db.business.currency;
  const left = freeSendsLeft(db);
  const recent = [...db.docs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

  const newDoc = (kind: 'invoice' | 'estimate') => {
    let id = '';
    update((d) => {
      const r = createDoc(d, kind);
      id = r.doc.id;
      return r.db;
    });
    go({ name: 'doc', id });
  };

  return (
    <Screen title={db.business.name || 'Invoice Jot'} back={false}>
      <div className="quick">
        <Btn onClick={() => newDoc('invoice')}>+ New invoice</Btn>
        <Btn kind="secondary" onClick={() => newDoc('estimate')}>
          + New estimate
        </Btn>
      </div>

      <div className="stats" role="list">
        <div className="stat" role="listitem">
          <span className="stat-label">Outstanding</span>
          <span className="stat-value">{formatMoney(s.outstanding, cur)}</span>
        </div>
        <div className={`stat ${s.overdueCount ? 'stat-warn' : ''}`} role="listitem">
          <span className="stat-label">Overdue{s.overdueCount ? ` (${s.overdueCount})` : ''}</span>
          <span className="stat-value">{formatMoney(s.overdue, cur)}</span>
        </div>
        <div className="stat" role="listitem">
          <span className="stat-label">Paid this month</span>
          <span className="stat-value">{formatMoney(s.paidThisMonth, cur)}</span>
        </div>
        <div className="stat" role="listitem">
          <span className="stat-label">Open estimates</span>
          <span className="stat-value">{s.openEstimates}</span>
        </div>
      </div>

      {!pro ? (
        <Card onClick={() => openPaywall('Unlimited invoices and no footer on your PDFs.')} label="Invoice Jot Pro">
          <strong>Free plan:</strong> {left} of {FREE_INVOICE_SENDS} invoice sends left. Drafts, estimates and receipts are unlimited.{' '}
          <span className="link">See Pro</span>
        </Card>
      ) : null}

      <h2 className="section">Recent</h2>
      {recent.length === 0 ? (
        <p className="muted">Nothing yet. Tap “New invoice” — it takes about a minute, no account needed.</p>
      ) : (
        <ul className="list">
          {recent.map((d) => {
            const t = docTotals(d);
            return (
              <li key={d.id}>
                <Card onClick={() => go({ name: 'doc', id: d.id })} label={`${d.kind} ${d.number}`}>
                  <div className="row">
                    <div>
                      <div className="strong">{d.clientSnapshot?.name || 'No client yet'}</div>
                      <div className="muted small">
                        {d.kind === 'invoice' ? 'Invoice' : 'Estimate'} {d.number} · {formatDate(d.issueDate)}
                      </div>
                    </div>
                    <div className="right">
                      <div className="strong">{formatMoney(d.kind === 'invoice' ? t.balance || t.total : t.total, cur)}</div>
                      <StatusPill s={displayStatus(d)} />
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
