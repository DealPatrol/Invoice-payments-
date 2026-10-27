'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowUpRight, Package, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Avatar, DataList, EmptyState, Panel, SearchInput, Stat, type Tone } from '@/components/ui/kit';
import { STATUS_STYLES, dashboardStats, displayStatus, monthlyRevenue } from '@/lib/studio-ops';
import {
  EMPTY_CUSTOMER, UNIT_SUGGESTIONS, calcTotals, formatDate, formatMoney, uid,
  type CatalogItem, type DisplayStatus, type StudioClient, type StudioInvoice,
} from '@/lib/studio';
import { btn, btnPrimary, input, label } from './ui';

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset" style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 12%, transparent)`, ['--tw-ring-color' as string]: `color-mix(in srgb, ${s.color} 25%, transparent)` }}>
      <i className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.label}
    </span>
  );
}

/** Smooth (Catmull-Rom → Bézier) path through points. */
function smoothPath(pts: [number, number][], floor = Infinity) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    c1[1] = Math.min(c1[1], floor); c2[1] = Math.min(c2[1], floor);
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function RevenueChart({ rows, money }: { rows: { month: string; billed: number; collected: number }[]; money: (n: number) => string }) {
  const W = 640, H = 200, P = 8;
  const max = Math.max(1, ...rows.flatMap((r) => [r.billed, r.collected])) * 1.15;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, rows.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const series = [
    { key: 'billed' as const, color: 'var(--accent)', id: 'g-billed' },
    { key: 'collected' as const, color: 'var(--success)', id: 'g-coll' },
  ];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="Billed and collected revenue, last 6 months">
        <defs>{series.map((s) => (
          <linearGradient key={s.id} id={s.id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity="0.28" /><stop offset="100%" stopColor={s.color} stopOpacity="0" /></linearGradient>
        ))}</defs>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={P} x2={W - P} y1={y(max * f / 1.15)} y2={y(max * f / 1.15)} stroke="var(--border)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
        {series.map((s) => {
          const pts = rows.map((r, i) => [x(i), y(r[s.key])] as [number, number]);
          const line = smoothPath(pts, H - P);
          return (
            <g key={s.key}>
              <path d={`${line} L${x(rows.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill={`url(#${s.id})`} />
              <path d={line} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between px-1 text-[11px] text-[var(--text-subtle)]">
        {rows.map((r) => <span key={r.month} title={`Billed ${money(r.billed)} · Collected ${money(r.collected)}`}>{new Date(`${r.month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</span>)}
      </div>
    </div>
  );
}

export function Dashboard({ invoices, today, currency, onOpen }: {
  invoices: StudioInvoice[]; today: string; currency: string; onOpen: (inv: StudioInvoice) => void;
}) {
  const s = dashboardStats(invoices, today);
  const rows = monthlyRevenue(invoices, today, 6);
  const money = (n: number) => formatMoney(n, currency);
  const overdue = invoices.filter((i) => displayStatus(i, today) === 'overdue');
  const recent = invoices.filter((i) => i.kind === 'invoice').sort((a, b) => b.issueDate.localeCompare(a.issueDate)).slice(0, 6);
  const billed6 = rows.reduce((t, r) => t + r.billed, 0);
  const coll6 = rows.reduce((t, r) => t + r.collected, 0);
  const stats: { label: string; value: string; tone: Tone }[] = [
    { label: 'Outstanding', value: money(s.outstanding), tone: 'accent' },
    { label: `Overdue (${s.overdueCount})`, value: money(s.overdue), tone: 'danger' },
    { label: 'Collected this month', value: money(s.paidThisMonth), tone: 'success' },
    { label: 'Collected all time', value: money(s.paidTotal), tone: 'success' },
    { label: `Open estimates (${s.openEstimates})`, value: money(s.openEstimatesValue), tone: 'violet' },
    { label: 'Avg. days to pay', value: s.avgDaysToPay === null ? '—' : `${s.avgDaysToPay} days`, tone: 'warning' },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {stats.map((x) => <Stat key={x.label} label={x.label} value={x.value} tone={x.tone} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Revenue" actions={
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--accent)]" />Billed <b className="tabular text-[var(--text)]">{money(billed6)}</b></span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--success)]" />Collected <b className="tabular text-[var(--text)]">{money(coll6)}</b></span>
          </div>}>
          <RevenueChart rows={rows} money={money} />
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><AlertTriangle size={15} className="text-[var(--danger)]" />Needs attention</span>} flush>
          {overdue.length === 0 ? <p className="p-5 text-sm text-[var(--text-muted)]">Nothing overdue. Nice.</p> : (
            <ul className="divide-y divide-[var(--border)]">
              {overdue.map((inv) => (
                <li key={inv.id}>
                  <button className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition hover:bg-[var(--surface-high)]" onClick={() => onOpen(inv)}>
                    <Avatar name={inv.customer.name || '?'} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium text-[var(--text)]">{inv.customer.name}</span><span className="text-xs text-[var(--text-muted)]">{inv.number} · due {formatDate(inv.dueDate)}</span></span>
                    <span className="tabular font-semibold text-[var(--danger)]">{formatMoney(calcTotals(inv).balanceDue, inv.business.currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Recent invoices" flush>
        {recent.length === 0 ? <EmptyState icon={ArrowUpRight} title="No invoices yet" body="Your latest invoices will show up here." /> : (
          <DataList rows={recent} rowKey={(r) => r.id}
            columns={[
              { header: 'Invoice', cell: (inv) => <button className="font-semibold text-[var(--accent)] hover:underline" onClick={() => onOpen(inv)}>{inv.number}</button> },
              { header: 'Customer', cell: (inv) => <span className="flex items-center gap-2.5"><Avatar name={inv.customer.name || '?'} />{inv.customer.name || 'No customer'}</span> },
              { header: 'Due', cell: (inv) => <span className="text-[var(--text-muted)]">{formatDate(inv.dueDate)}</span> },
              { header: 'Status', cell: (inv) => <StatusBadge status={displayStatus(inv, today)} /> },
              { header: 'Amount', align: 'right', cell: (inv) => <span className="font-semibold">{formatMoney(calcTotals(inv).total, inv.business.currency)}</span> },
            ]}
            mobile={(inv) => (
              <button className="flex w-full items-center gap-3 text-left" onClick={() => onOpen(inv)}>
                <Avatar name={inv.customer.name || '?'} />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[var(--text)]">{inv.customer.name || 'No customer'}</span><span className="text-xs text-[var(--text-muted)]">{inv.number} · due {formatDate(inv.dueDate)}</span></span>
                <span className="flex flex-col items-end gap-1"><span className="tabular font-semibold text-[var(--text)]">{formatMoney(calcTotals(inv).total, inv.business.currency)}</span><StatusBadge status={displayStatus(inv, today)} /></span>
              </button>
            )} />
        )}
      </Panel>
    </div>
  );
}

const iconBtn = 'rounded-md p-1.5 text-[var(--text-subtle)] transition hover:bg-[var(--surface-high)] hover:text-[var(--text)]';
const dangerBtn = 'rounded-md p-1.5 text-[var(--text-subtle)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]';
const editBox = 'animate-in grid gap-3 border-b border-[var(--border)] bg-[var(--surface-high)] p-4 sm:grid-cols-2';

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
  const stats = (c: StudioClient) => {
    const theirs = invoices.filter((i) => i.kind === 'invoice' && (i.clientId === c.id || i.customer.name === c.name));
    const owed = theirs.reduce((a, i) => a + (i.status === 'void' || i.status === 'draft' ? 0 : calcTotals(i).balanceDue), 0);
    return { count: theirs.length, owed };
  };
  const add = () => setEdit({ ...EMPTY_CUSTOMER, id: uid(), notes: '', createdAt: new Date().toISOString() });
  return (
    <Panel flush>
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">Clients <span className="font-normal text-[var(--text-subtle)]">· {clients.length}</span></h2>
        <div className="flex gap-2"><SearchInput value={q} onChange={setQ} placeholder="Search clients" /><button className={btnPrimary} onClick={add}><Plus size={16} />Client</button></div>
      </div>
      {edit && (
        <div className={editBox}>
          {(['name', 'company', 'email', 'phone'] as const).map((k) => (
            <div key={k}><label className={label + ' capitalize'}>{k}</label><input className={input} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
          ))}
          <div className="sm:col-span-2"><label className={label}>Address</label><textarea rows={2} className={input} value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={label}>Private notes</label><input className={input} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          <div className="flex gap-2"><button className={btnPrimary} onClick={save}>Save client</button><button className={btn} onClick={() => setEdit(null)}>Cancel</button></div>
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState icon={Users} title={q ? 'No matching clients' : 'No clients yet'} body={q ? 'Try another search.' : 'Saving an invoice adds its customer here automatically.'} action={!q && <button className={btnPrimary} onClick={add}><Plus size={16} />Add client</button>} />
      ) : (
        <DataList rows={shown} rowKey={(c) => c.id}
          columns={[
            { header: 'Client', cell: (c) => <button className="flex items-center gap-2.5 text-left" onClick={() => setEdit(c)}><Avatar name={c.name} /><span><span className="block font-semibold">{c.name}</span>{c.company && <span className="text-xs text-[var(--text-muted)]">{c.company}</span>}</span></button> },
            { header: 'Contact', cell: (c) => <span className="text-[var(--text-muted)]">{c.email || c.phone || '—'}</span> },
            { header: 'Invoices', align: 'right', cell: (c) => stats(c).count },
            { header: 'Owes', align: 'right', cell: (c) => { const o = stats(c).owed; return <span className="font-semibold" style={{ color: o > 0 ? 'var(--warning)' : 'var(--text-subtle)' }}>{formatMoney(o)}</span>; } },
            { header: '', align: 'right', cell: (c) => (
              <div className="flex items-center justify-end gap-1">
                <button className={btn + ' !px-2.5 !py-1.5 text-xs'} onClick={() => onNewFor(c)}>New invoice</button>
                <button aria-label={`Edit ${c.name}`} className={iconBtn} onClick={() => setEdit(c)}><Pencil size={15} /></button>
                <button aria-label={`Delete ${c.name}`} className={dangerBtn} onClick={() => confirm(`Delete ${c.name}?`) && onChange(clients.filter((x) => x.id !== c.id))}><Trash2 size={15} /></button>
              </div>) },
          ]}
          mobile={(c) => (
            <div className="flex items-center gap-3">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setEdit(c)}>
                <Avatar name={c.name} />
                <span className="min-w-0"><span className="block truncate font-semibold text-[var(--text)]">{c.name}</span><span className="block truncate text-xs text-[var(--text-muted)]">{c.email || c.phone || 'No contact info'} · {stats(c).count} invoices</span></span>
              </button>
              <button className={btn + ' !px-2.5 !py-1.5 text-xs'} onClick={() => onNewFor(c)}>Invoice</button>
            </div>
          )} />
      )}
    </Panel>
  );
}

export function CatalogPanel({ items, currency, onChange }: { items: CatalogItem[]; currency: string; onChange: (list: CatalogItem[]) => void }) {
  const [edit, setEdit] = useState<CatalogItem | null>(null);
  const [q, setQ] = useState('');
  const save = () => {
    if (!edit || !edit.name.trim()) return;
    onChange(items.some((c) => c.id === edit.id) ? items.map((c) => (c.id === edit.id ? edit : c)) : [edit, ...items]);
    setEdit(null);
  };
  const add = () => setEdit({ id: uid(), name: '', details: '', unit: '', unitPrice: 0, taxable: true });
  const shown = items.filter((c) => `${c.name} ${c.details}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel flush>
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">Products & services <span className="font-normal text-[var(--text-subtle)]">· {items.length}</span></h2>
        <div className="flex gap-2"><SearchInput value={q} onChange={setQ} placeholder="Search items" /><button className={btnPrimary} onClick={add}><Plus size={16} />Item</button></div>
      </div>
      <datalist id="cat-units">{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
      {edit && (
        <div className={editBox}>
          <div className="sm:col-span-2"><label className={label}>Name</label><input className={input} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={label}>Details</label><input className={input} value={edit.details} onChange={(e) => setEdit({ ...edit, details: e.target.value })} /></div>
          <div><label className={label}>Unit</label><input list="cat-units" className={input} value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></div>
          <div><label className={label}>Price</label><input type="number" step="0.01" className={input} value={edit.unitPrice} onChange={(e) => setEdit({ ...edit, unitPrice: Number(e.target.value) })} /></div>
          <div className="flex gap-2"><button className={btnPrimary} onClick={save}>Save item</button><button className={btn} onClick={() => setEdit(null)}>Cancel</button></div>
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState icon={Package} title={q ? 'No matching items' : 'No saved items yet'} body={q ? 'Try another search.' : 'Save services you bill often (e.g. “Pine straw — bale”) to add them in one tap.'} action={!q && <button className={btnPrimary} onClick={add}><Plus size={16} />Add item</button>} />
      ) : (
        <DataList rows={shown} rowKey={(c) => c.id}
          columns={[
            { header: 'Item', cell: (c) => <button className="flex items-center gap-3 text-left" onClick={() => setEdit(c)}><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Package size={15} /></span><span><span className="block font-semibold">{c.name}</span>{c.details && <span className="text-xs text-[var(--text-muted)]">{c.details}</span>}</span></button> },
            { header: 'Unit', cell: (c) => <span className="text-[var(--text-muted)]">{c.unit || '—'}</span> },
            { header: 'Price', align: 'right', cell: (c) => <span className="font-semibold">{formatMoney(c.unitPrice, currency)}</span> },
            { header: '', align: 'right', cell: (c) => (
              <div className="flex justify-end gap-1">
                <button aria-label={`Edit ${c.name}`} className={iconBtn} onClick={() => setEdit(c)}><Pencil size={15} /></button>
                <button aria-label={`Delete ${c.name}`} className={dangerBtn} onClick={() => onChange(items.filter((x) => x.id !== c.id))}><Trash2 size={15} /></button>
              </div>) },
          ]}
          mobile={(c) => (
            <div className="flex items-center gap-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(c)}><span className="block truncate font-semibold text-[var(--text)]">{c.name}</span><span className="block truncate text-xs text-[var(--text-muted)]">{c.unit ? `per ${c.unit}` : 'Flat'}{c.details ? ` · ${c.details}` : ''}</span></button>
              <span className="tabular font-semibold text-[var(--text)]">{formatMoney(c.unitPrice, currency)}</span>
              <button aria-label={`Delete ${c.name}`} className={dangerBtn} onClick={() => onChange(items.filter((x) => x.id !== c.id))}><Trash2 size={15} /></button>
            </div>
          )} />
      )}
    </Panel>
  );
}
