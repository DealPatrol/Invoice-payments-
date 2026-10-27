'use client';

import { useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { STATUS_STYLES, dashboardStats, displayStatus, monthlyRevenue } from '@/lib/studio-ops';
import {
  EMPTY_CUSTOMER, UNIT_SUGGESTIONS, calcTotals, formatDate, formatMoney, uid,
  type CatalogItem, type DisplayStatus, type StudioClient, type StudioInvoice,
} from '@/lib/studio';
import { btn, btnPrimary, card, input, label } from './ui';

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: s.color, background: `${s.color}22` }}>
      {s.label}
    </span>
  );
}

export function Dashboard({ invoices, today, currency, onOpen }: {
  invoices: StudioInvoice[]; today: string; currency: string; onOpen: (inv: StudioInvoice) => void;
}) {
  const s = dashboardStats(invoices, today);
  const rows = monthlyRevenue(invoices, today, 6);
  const max = Math.max(1, ...rows.flatMap((r) => [r.billed, r.collected]));
  const money = (n: number) => formatMoney(n, currency);
  const overdue = invoices.filter((i) => displayStatus(i, today) === 'overdue');
  const stats = [
    { label: 'Outstanding', value: money(s.outstanding), color: '#4f6ef7' },
    { label: `Overdue (${s.overdueCount})`, value: money(s.overdue), color: '#f7524f' },
    { label: 'Collected this month', value: money(s.paidThisMonth), color: '#22c97a' },
    { label: 'Collected all time', value: money(s.paidTotal), color: '#22c97a' },
    { label: `Open estimates (${s.openEstimates})`, value: money(s.openEstimatesValue), color: '#a78bfa' },
    { label: 'Avg. days to pay', value: s.avgDaysToPay === null ? '—' : `${s.avgDaysToPay} days`, color: '#f5a623' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((x) => (
          <div key={x.label} className={card}>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{x.label}</div>
            <div className="mt-1 text-xl font-black sm:text-2xl" style={{ color: x.color }}>{x.value}</div>
          </div>
        ))}
      </div>
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-[var(--text)]">Revenue — last 6 months</h2>
          <div className="flex gap-3 text-xs text-[var(--text-muted)]">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#4f6ef7]" />Billed</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#22c97a]" />Collected</span>
          </div>
        </div>
        <div className="flex h-44 items-end gap-3">
          {rows.map((r) => (
            <div key={r.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-36 w-full items-end justify-center gap-1">
                <div title={money(r.billed)} className="w-1/3 rounded-t bg-[#4f6ef7]" style={{ height: `${(r.billed / max) * 100}%` }} />
                <div title={money(r.collected)} className="w-1/3 rounded-t bg-[#22c97a]" style={{ height: `${(r.collected / max) * 100}%` }} />
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {new Date(`${r.month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={card}>
        <h2 className="mb-2 flex items-center gap-2 font-bold text-[var(--text)]"><AlertTriangle size={16} className="text-[#f7524f]" />Needs attention</h2>
        {overdue.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Nothing overdue. Nice.</p> : (
          <ul className="divide-y divide-[var(--border)]">
            {overdue.map((inv) => (
              <li key={inv.id}>
                <button className="flex w-full items-center justify-between py-2 text-left text-sm" onClick={() => onOpen(inv)}>
                  <span className="text-[var(--text)]">{inv.number} · {inv.customer.name} · due {formatDate(inv.dueDate)}</span>
                  <span className="font-bold text-[#f7524f]">{formatMoney(calcTotals(inv).balanceDue, inv.business.currency)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ClientsPanel({ clients, invoices, onChange, onNewFor }: {
  clients: StudioClient[]; invoices: StudioInvoice[]; onChange: (list: StudioClient[]) => void; onNewFor: (c: StudioClient) => void;
}) {
  const [edit, setEdit] = useState<StudioClient | null>(null);
  const [q, setQ] = useState('');
  const save = () => {
    if (!edit || !edit.name.trim()) return;
    onChange(clients.some((c) => c.id === edit.id) ? clients.map((c) => (c.id === edit.id ? edit : c)) : [edit, ...clients]);
    setEdit(null);
  };
  const shown = clients.filter((c) => `${c.name} ${c.company} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-[var(--text)]">Clients ({clients.length})</h2>
        <button className={btnPrimary} onClick={() => setEdit({ ...EMPTY_CUSTOMER, id: uid(), notes: '', createdAt: new Date().toISOString() })}><Plus size={16} />Client</button>
      </div>
      {edit && (
        <div className="mb-4 grid gap-2 rounded-lg border border-[var(--accent)] p-3 sm:grid-cols-2">
          {(['name', 'company', 'email', 'phone'] as const).map((k) => (
            <div key={k}><label className={label}>{k}</label><input className={input} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
          ))}
          <div className="sm:col-span-2"><label className={label}>Address</label><textarea rows={2} className={input} value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={label}>Private notes</label><input className={input} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          <div className="flex gap-2"><button className={btnPrimary} onClick={save}>Save client</button><button className={btn} onClick={() => setEdit(null)}>Cancel</button></div>
        </div>
      )}
      <input className={input + ' mb-2'} placeholder="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length === 0 && <p className="text-sm text-[var(--text-muted)]">No clients yet. Saving an invoice adds its customer here automatically.</p>}
      <ul className="divide-y divide-[var(--border)]">
        {shown.map((c) => {
          const theirs = invoices.filter((i) => i.kind === 'invoice' && (i.clientId === c.id || i.customer.name === c.name));
          const owed = theirs.reduce((a, i) => a + (i.status === 'void' || i.status === 'draft' ? 0 : calcTotals(i).balanceDue), 0);
          return (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <button className="text-left" onClick={() => setEdit(c)}>
                <div className="font-semibold text-[var(--text)]">{c.name}{c.company ? ` · ${c.company}` : ''}</div>
                <div className="text-xs text-[var(--text-muted)]">{c.email || c.phone || 'No contact info'} · {theirs.length} invoices · owes {formatMoney(owed)}</div>
              </button>
              <div className="flex gap-2">
                <button className={btn} onClick={() => onNewFor(c)}>New invoice</button>
                <button aria-label="Delete client" className="text-[var(--danger)]" onClick={() => confirm(`Delete ${c.name}?`) && onChange(clients.filter((x) => x.id !== c.id))}><Trash2 size={16} /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CatalogPanel({ items, currency, onChange }: { items: CatalogItem[]; currency: string; onChange: (list: CatalogItem[]) => void }) {
  const [edit, setEdit] = useState<CatalogItem | null>(null);
  const save = () => {
    if (!edit || !edit.name.trim()) return;
    onChange(items.some((c) => c.id === edit.id) ? items.map((c) => (c.id === edit.id ? edit : c)) : [edit, ...items]);
    setEdit(null);
  };
  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-[var(--text)]">Products & services ({items.length})</h2>
        <button className={btnPrimary} onClick={() => setEdit({ id: uid(), name: '', details: '', unit: '', unitPrice: 0, taxable: true })}><Plus size={16} />Item</button>
      </div>
      <datalist id="cat-units">{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
      {edit && (
        <div className="mb-4 grid gap-2 rounded-lg border border-[var(--accent)] p-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={label}>Name</label><input className={input} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={label}>Details</label><input className={input} value={edit.details} onChange={(e) => setEdit({ ...edit, details: e.target.value })} /></div>
          <div><label className={label}>Unit</label><input list="cat-units" className={input} value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></div>
          <div><label className={label}>Price</label><input type="number" step="0.01" className={input} value={edit.unitPrice} onChange={(e) => setEdit({ ...edit, unitPrice: Number(e.target.value) })} /></div>
          <div className="flex gap-2"><button className={btnPrimary} onClick={save}>Save item</button><button className={btn} onClick={() => setEdit(null)}>Cancel</button></div>
        </div>
      )}
      {items.length === 0 && <p className="text-sm text-[var(--text-muted)]">Save services you bill often (e.g. “Pine straw — bale”, “Mow, edge, blow”) to add them in one tap.</p>}
      <ul className="divide-y divide-[var(--border)]">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-3">
            <button className="text-left" onClick={() => setEdit(c)}>
              <div className="font-semibold text-[var(--text)]">{c.name}</div>
              <div className="text-xs text-[var(--text-muted)]">{formatMoney(c.unitPrice, currency)}{c.unit ? ` / ${c.unit}` : ''}{c.details ? ` · ${c.details}` : ''}</div>
            </button>
            <button aria-label="Delete item" className="text-[var(--danger)]" onClick={() => onChange(items.filter((x) => x.id !== c.id))}><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
