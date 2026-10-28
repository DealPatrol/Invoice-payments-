'use client';

import { useMemo, useState } from 'react';
import { Clock, Download, Eye, Link2, Plus, Receipt, Trash2 } from 'lucide-react';
import { formatDate, formatMoney, todayISO, uid, type StudioClient, type StudioInvoice } from '@/lib/studio';
import {
  EXPENSE_CATEGORIES, nextReminderDate, taxSummary, taxSummaryCSV, unbilled, viewSummary,
  type Brand, type Expense, type StudioExtras, type TimeEntry,
} from '@/lib/studio-suite';
import { btn, btnPrimary, btnSm, card, input, label } from './ui';
import { EmptyState, Panel, Pill, Stat } from '@/components/ui/kit';

export function BrandSwitcher({ extras, onSwitch, onAdd }: { extras: StudioExtras; onSwitch: (b: Brand) => void; onAdd: () => void }) {
  if (!extras.brands.length) return null;
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
      <span className="font-semibold">Business</span>
      <select aria-label="Active business" className={input + ' w-auto'} value={extras.activeBrandId}
        onChange={(e) => { if (e.target.value === '__new') return onAdd(); const b = extras.brands.find((x) => x.id === e.target.value); if (b) onSwitch(b); }}>
        {extras.brands.map((b) => <option key={b.id} value={b.id}>{b.profile.name || 'Untitled business'}</option>)}
        <option value="__new">+ Add business…</option>
      </select>
    </label>
  );
}

export function ExpensesTimePanel({ extras, currency, brandId, draft, clients, onChange, onBill }: {
  extras: StudioExtras; currency: string; brandId: string; draft: StudioInvoice; clients: StudioClient[];
  onChange: (x: StudioExtras) => void; onBill: (expenseIds: string[], timeIds: string[]) => void;
}) {
  const [exp, setExp] = useState({ date: todayISO(), description: '', category: 'Materials', amount: '', billable: true });
  const [tm, setTm] = useState({ date: todayISO(), description: '', hours: '', rate: '45', clientId: '' });
  const open = unbilled(extras, brandId);
  const mineExp = extras.expenses.filter((e) => !brandId || e.brandId === brandId);
  const mineTime = extras.time.filter((t) => !brandId || t.brandId === brandId);
  const addExpense = () => {
    const amount = Number(exp.amount);
    if (!exp.description.trim() || !(amount > 0)) return;
    const e: Expense = { id: uid(), brandId, date: exp.date, description: exp.description.trim(), category: exp.category, amount, billable: exp.billable, invoiceId: '' };
    onChange({ ...extras, expenses: [e, ...extras.expenses] });
    setExp({ ...exp, description: '', amount: '' });
  };
  const addTime = () => {
    const hours = Number(tm.hours); const rate = Number(tm.rate);
    if (!(hours > 0) || !(rate >= 0)) return;
    const t: TimeEntry = { id: uid(), brandId, date: tm.date, description: tm.description.trim() || 'Labor', hours, rate, clientId: tm.clientId, invoiceId: '' };
    onChange({ ...extras, time: [t, ...extras.time] });
    setTm({ ...tm, description: '', hours: '' });
  };
  const money = (n: number) => formatMoney(n, currency);
  const billedTo = (id: string) => id ? (id === draft.id ? 'this invoice' : 'billed') : '';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Unbilled time" value={money(open.time.reduce((s, t) => s + t.hours * t.rate, 0))} tone="accent" sub={`${open.time.reduce((s, t) => s + t.hours, 0)} hours`} />
        <Stat label="Billable expenses" value={money(open.expenses.reduce((s, e) => s + e.amount, 0))} tone="warning" sub={`${open.expenses.length} unbilled`} />
        <Stat label="All expenses logged" value={money(mineExp.reduce((s, e) => s + e.amount, 0))} tone="neutral" sub={`${mineExp.length} entries`} />
      </div>
      <div className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-[var(--text)]">Bill to {draft.kind === 'invoice' ? `invoice ${draft.number}` : 'an invoice'}</h2>
          <button className={btnPrimary} disabled={draft.kind !== 'invoice' || (!open.expenses.length && !open.time.length)}
            onClick={() => onBill(open.expenses.map((e) => e.id), open.time.map((t) => t.id))}>
            <Plus size={16} />Add {open.time.length} time + {open.expenses.length} expense item(s)
          </button>
        </div>
        <p className="text-sm text-[var(--text-muted)]">Unbilled time and billable expenses are added as line items to the invoice open in the editor.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--text)]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Clock size={15} /></span>Log time</h2>
          <div className="grid grid-cols-2 gap-2">
            <div><span className={label}>Date</span><input type="date" className={input} value={tm.date} onChange={(e) => setTm({ ...tm, date: e.target.value })} /></div>
            <div><span className={label}>Client</span><select className={input} value={tm.clientId} onChange={(e) => setTm({ ...tm, clientId: e.target.value })}><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="col-span-2"><span className={label}>Work done</span><input className={input} placeholder="Mowing and edging" value={tm.description} onChange={(e) => setTm({ ...tm, description: e.target.value })} /></div>
            <div><span className={label}>Hours</span><input inputMode="decimal" className={input} value={tm.hours} onChange={(e) => setTm({ ...tm, hours: e.target.value })} /></div>
            <div><span className={label}>Rate / hr</span><input inputMode="decimal" className={input} value={tm.rate} onChange={(e) => setTm({ ...tm, rate: e.target.value })} /></div>
          </div>
          <button className={btn + ' mt-3'} onClick={addTime}><Plus size={16} />Log time</button>
          {mineTime.length === 0 ? <EmptyState icon={Clock} title="No time logged" body="Track hours here, then bill them in one click." /> : (
          <ul className="mt-4 divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] text-sm">
            {mineTime.slice(0, 30).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-[var(--text)]">{t.description}</span><span className="text-xs text-[var(--text-muted)]">{formatDate(t.date)} · {t.hours} hr × {money(t.rate)}</span></span>
                {t.invoiceId ? <Pill tone="success">{billedTo(t.invoiceId)}</Pill> : <span className="tabular font-semibold text-[var(--text)]">{money(t.hours * t.rate)}</span>}
                <button aria-label="Delete time" className="rounded-md p-1.5 text-[var(--text-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" onClick={() => onChange({ ...extras, time: extras.time.filter((x) => x.id !== t.id) })}><Trash2 size={14} /></button>
              </li>))}
          </ul>)}
        </div>
        <div className={card}>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--text)]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]"><Receipt size={15} /></span>Add expense</h2>
          <div className="grid grid-cols-2 gap-2">
            <div><span className={label}>Date</span><input type="date" className={input} value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value })} /></div>
            <div><span className={label}>Category</span><select className={input} value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="col-span-2"><span className={label}>Description</span><input className={input} placeholder="Mulch, 10 bags" value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} /></div>
            <div><span className={label}>Amount</span><input inputMode="decimal" className={input} value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} /></div>
            <label className="flex items-end gap-2 pb-2 text-sm text-[var(--text)]"><input type="checkbox" checked={exp.billable} onChange={(e) => setExp({ ...exp, billable: e.target.checked })} />Bill to client</label>
          </div>
          <button className={btn + ' mt-3'} onClick={addExpense}><Plus size={16} />Add expense</button>
          {mineExp.length === 0 ? <EmptyState icon={Receipt} title="No expenses yet" body="Log materials and costs; billable ones go on the next invoice." /> : (
          <ul className="mt-4 divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] text-sm">
            {mineExp.slice(0, 30).map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-[var(--text)]">{e.description}</span><span className="text-xs text-[var(--text-muted)]">{formatDate(e.date)} · {e.category}</span></span>
                {e.invoiceId ? <Pill tone="success">billed</Pill> : e.billable ? <Pill tone="warning">billable</Pill> : null}
                <span className="tabular font-semibold text-[var(--text)]">{money(e.amount)}</span>
                <button aria-label="Delete expense" className="rounded-md p-1.5 text-[var(--text-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" onClick={() => onChange({ ...extras, expenses: extras.expenses.filter((x) => x.id !== e.id) })}><Trash2 size={14} /></button>
              </li>))}
          </ul>)}
        </div>
      </div>
    </div>
  );
}

export function TaxReportPanel({ invoices, extras, currency, onDownload }: { invoices: StudioInvoice[]; extras: StudioExtras; currency: string; onDownload: (name: string, csv: string) => void }) {
  const [year, setYear] = useState(Number(todayISO().slice(0, 4)));
  const s = useMemo(() => taxSummary(invoices, extras, year), [invoices, extras, year]);
  const money = (n: number) => formatMoney(n, currency);
  const maxQ = Math.max(1, ...s.quarters.map((q) => q.collected));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-[var(--text)]">Tax summary {year}</h2><p className="text-sm text-[var(--text-muted)]">Cash basis. Not tax advice.</p></div>
        <div className="flex gap-2">
          <select aria-label="Tax year" className={input + ' w-auto'} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[0, 1, 2].map((d) => { const y = Number(todayISO().slice(0, 4)) - d; return <option key={y} value={y}>{y}</option>; })}
          </select>
          <button className={btn} onClick={() => onDownload(`tax-summary-${year}.csv`, taxSummaryCSV(s))}><Download size={16} />CSV for your accountant</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Collected" value={money(s.totals.collected)} tone="success" />
        <Stat label="Sales tax collected" value={money(s.totals.taxCollected)} tone="warning" />
        <Stat label="Expenses" value={money(s.totals.expenses)} tone="danger" />
        <Stat label="Net" value={money(s.totals.net)} tone="accent" />
      </div>
      <Panel title="By business" flush>
        <div className="overflow-x-auto">
          <table className="table-pro min-w-[640px]">
            <thead><tr><th>Business</th><th className="!text-right">Invoiced</th><th className="!text-right">Collected</th><th className="!text-right">Sales tax</th><th className="!text-right">Expenses</th><th className="!text-right">Net</th></tr></thead>
            <tbody>
              {[...s.rows, s.totals].map((r) => (
                <tr key={r.brand} className={r.brand === 'All brands' ? 'font-semibold [&>td]:bg-[var(--surface-high)]' : ''}>
                  <td>{r.brand}</td>{[r.invoiced, r.collected, r.taxCollected, r.expenses, r.net].map((v, i) => <td key={i} className="tabular text-right">{money(v)}</td>)}
                </tr>))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-[var(--text-muted)]">Collected = payments received in {year}. Net = collected − sales tax − expenses.</p>
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="By quarter">
          <div className="space-y-3">
            {s.quarters.map((q) => (
              <div key={q.quarter}>
                <div className="flex justify-between text-sm"><span className="font-medium text-[var(--text)]">{q.quarter}</span><span className="tabular text-[var(--text-muted)]">{money(q.collected)} in · {money(q.taxCollected)} tax · {money(q.expenses)} out</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--surface-high)]"><div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${(q.collected / maxQ) * 100}%` }} /></div>
              </div>))}
          </div>
        </Panel>
        <Panel title="Expenses by category" flush>
          {s.expenseByCategory.length ? (
            <ul className="divide-y divide-[var(--border)]">{s.expenseByCategory.map((c) => <li key={c.category} className="flex justify-between px-5 py-2.5 text-sm"><span className="text-[var(--text)]">{c.category}</span><span className="tabular font-semibold text-[var(--text)]">{money(c.amount)}</span></li>)}</ul>
          ) : <EmptyState icon={Receipt} title={`No expenses for ${year}`} body="Log expenses under Time & expenses." />}
        </Panel>
      </div>
    </div>
  );
}

export function TrackingCard({ inv, offsets, today }: { inv: StudioInvoice; offsets: number[]; today: string }) {
  const v = viewSummary(inv);
  const next = nextReminderDate(inv, offsets, today);
  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div className="rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text)]">
      <div className="flex items-center gap-2 font-semibold"><Eye size={14} />{v.count ? `Viewed ${v.count} time${v.count === 1 ? '' : 's'}` : 'Not viewed yet'}</div>
      {v.count > 0 && <div className="text-xs text-[var(--text-muted)]">First {fmt(v.first)} · last {fmt(v.last)}</div>}
      {inv.kind === 'invoice' && <div className="mt-1 text-xs text-[var(--text-muted)]">{next ? `Next overdue reminder: ${formatDate(next)}` : 'No reminders scheduled'} (days after due: {offsets.join(', ')})</div>}
    </div>
  );
}

export function PortalCard({ clients, enabled, onCopy }: { clients: StudioClient[]; enabled: boolean; onCopy: (c: StudioClient) => void }) {
  const withEmail = clients.filter((c) => c.email);
  return (
    <div className={card}>
      <h2 className="mb-1 font-bold text-[var(--text)]">Client portals</h2>
      <p className="mb-3 text-sm text-[var(--text-muted)]">One private link per client showing all their invoices and estimates, with Pay buttons.{enabled ? '' : ' Sign in to create portal links.'}</p>
      {withEmail.length === 0 && <p className="text-sm text-[var(--text-muted)]">Add an email to a client to give them a portal.</p>}
      <ul className="divide-y divide-[var(--border)]">
        {withEmail.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm text-[var(--text)]">
            <span>{c.name} <span className="text-[var(--text-muted)]">{c.email}</span></span>
            <button className={btnSm} disabled={!enabled} onClick={() => onCopy(c)}><Link2 size={13} />Copy portal link</button>
          </li>))}
      </ul>
    </div>
  );
}
