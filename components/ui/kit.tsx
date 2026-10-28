import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { Search } from 'lucide-react';

type Icon = ComponentType<{ size?: number | string; className?: string }>;

/** Page container shared by every app screen. */
export function Page({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className={`mx-auto ${narrow ? 'max-w-4xl' : 'max-w-[1280px]'} space-y-6 p-4 sm:p-6 lg:p-10`}>{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, eyebrow, actions }: { title: ReactNode; subtitle?: ReactNode; eyebrow?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-40';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--surface-high)] disabled:opacity-40';

export function LinkButton({ href, children, primary = true }: { href: string; children: ReactNode; primary?: boolean }) {
  return <Link href={href} className={primary ? btnPrimary : btnGhost}>{children}</Link>;
}

export type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'violet';
const toneVar: Record<Tone, string> = {
  accent: 'var(--accent)', success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', neutral: 'var(--text-subtle)', violet: '#8b5cf6',
};
export function toneColor(t: Tone) { return toneVar[t]; }

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const c = toneVar[tone];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold capitalize"
      style={{ color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c} 22%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  paid: 'success', accepted: 'success', active: 'success', succeeded: 'success', approved: 'success',
  sent: 'accent', pending: 'warning', viewed: 'violet', partial: 'warning', draft: 'neutral',
  overdue: 'danger', declined: 'danger', failed: 'danger', void: 'neutral', converted: 'violet', expired: 'neutral',
};
export function StatusPill({ status }: { status: string }) {
  return <Pill tone={STATUS_TONE[status?.toLowerCase()] ?? 'neutral'}>{status}</Pill>;
}

export function Stat({ label, value, tone = 'accent', sub, icon: I }: { label: string; value: ReactNode; tone?: Tone; sub?: ReactNode; icon?: Icon }) {
  const c = toneVar[tone];
  return (
    <div className="animate-in rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{label}</p>
        {I && <span className="rounded-lg p-1.5" style={{ color: c, background: `color-mix(in srgb, ${c} 12%, transparent)` }}><I size={15} /></span>}
      </div>
      <p className="tabular mt-3 text-[1.75rem] font-bold leading-none tracking-tight" style={{ color: tone === 'neutral' ? 'var(--text)' : c }}>{value}</p>
      {sub && <p className="mt-2 text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

export function StatGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols];
  return <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${c}`}>{children}</div>;
}

export function Panel({ title, actions, children, flush = false, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <section className={`animate-in overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-[var(--text)]">{title}</h2>{actions}
        </div>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <span className="sr-only">{placeholder}</span>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text)] shadow-[var(--shadow-xs)] outline-none transition placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] focus:shadow-[var(--ring)]" />
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface-sunken)] p-0.5">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition ${value === o.value ? 'bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
          {o.label}{o.count != null && <span className="tabular rounded-full bg-[var(--surface-high)] px-1.5 text-[11px] text-[var(--text-subtle)]">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: I, title, body, action }: { icon: Icon; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] ring-8 ring-[color-mix(in_srgb,var(--accent-soft)_45%,transparent)]"><I size={22} /></span>
      <h3 className="text-[15px] font-semibold text-[var(--text)]">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-2 p-5" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-11" />)}</div>;
}

export function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
  return <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: `hsl(${hue} 55% 48%)` }}>{initials}</span>;
}

/** Desktop table + mobile cards with one data source. */
export function DataList<T>({ rows, rowKey, columns, mobile }: {
  rows: T[]; rowKey: (r: T) => string | number;
  columns: { header: string; cell: (r: T) => ReactNode; align?: 'right'; className?: string }[];
  mobile: (r: T) => ReactNode;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="table-pro">
          <thead><tr>{columns.map((c) => <th key={c.header} className={c.align === 'right' ? '!text-right' : ''}>{c.header}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={rowKey(r)}>{columns.map((c) => <td key={c.header} className={`${c.align === 'right' ? 'tabular text-right' : ''} ${c.className ?? ''}`}>{c.cell(r)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <ul className="divide-y divide-[var(--border)] md:hidden">{rows.map((r) => <li key={rowKey(r)} className="px-4 py-3.5">{mobile(r)}</li>)}</ul>
    </>
  );
}
