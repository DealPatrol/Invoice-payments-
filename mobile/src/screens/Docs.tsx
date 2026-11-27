import { useState } from 'react';
import { useApp } from '../store';
import { Btn, Card, Empty, Screen, StatusPill } from '../ui';
import { createDoc } from '../lib/db';
import { displayStatus, docTotals, type DisplayStatus } from '../lib/calc';
import { formatDate, formatMoney } from '../lib/util';

type Filter = 'all' | DisplayStatus | 'unpaid';

export function Docs({ kind }: { kind: 'invoice' | 'estimate' }) {
  const { db, update, go } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const label = kind === 'invoice' ? 'Invoices' : 'Estimates';
  const filters: Filter[] = kind === 'invoice' ? ['all', 'unpaid', 'overdue', 'draft', 'paid'] : ['all', 'draft', 'sent', 'accepted', 'declined'];
  const docs = db.docs
    .filter((d) => d.kind === kind)
    .filter((d) => {
      const s = displayStatus(d);
      if (filter === 'all') return true;
      if (filter === 'unpaid') return ['sent', 'overdue', 'partial'].includes(s);
      return s === filter;
    })
    .filter((d) => !q || `${d.number} ${d.title} ${d.clientSnapshot?.name ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number));

  const create = () => {
    let id = '';
    update((d) => {
      const r = createDoc(d, kind);
      id = r.doc.id;
      return r.db;
    });
    go({ name: 'doc', id });
  };

  return (
    <Screen title={label} back={false} action={<button className="link-btn" onClick={create} aria-label={`New ${kind}`}>+ New</button>}>
      <div className="segmented" role="tablist" aria-label="Document type">
        <button role="tab" aria-selected={kind === 'invoice'} className={kind === 'invoice' ? 'on' : ''} onClick={() => go({ name: 'docs', kind: 'invoice' })}>
          Invoices
        </button>
        <button role="tab" aria-selected={kind === 'estimate'} className={kind === 'estimate' ? 'on' : ''} onClick={() => go({ name: 'docs', kind: 'estimate' })}>
          Estimates
        </button>
      </div>
      <input className="search" type="search" placeholder={`Search ${label.toLowerCase()}`} aria-label={`Search ${label.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips" role="group" aria-label="Filter">
        {filters.map((f) => (
          <button key={f} className={`chip ${filter === f ? 'on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {docs.length === 0 ? (
        <Empty title={`No ${label.toLowerCase()} here`} body={kind === 'invoice' ? 'Create one in under a minute. Drafts are always free.' : 'Quote the job, then turn it into an invoice with one tap.'} action={<Btn onClick={create}>New {kind}</Btn>} />
      ) : (
        <ul className="list">
          {docs.map((d) => {
            const t = docTotals(d);
            return (
              <li key={d.id}>
                <Card onClick={() => go({ name: 'doc', id: d.id })} label={`${d.number} ${d.clientSnapshot?.name ?? ''}`}>
                  <div className="row">
                    <div>
                      <div className="strong">{d.clientSnapshot?.name || 'No client yet'}</div>
                      <div className="muted small">
                        {d.number}
                        {d.title ? ` · ${d.title}` : ''} · {formatDate(d.issueDate)}
                      </div>
                    </div>
                    <div className="right">
                      <div className="strong">{formatMoney(t.total, db.business.currency)}</div>
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
