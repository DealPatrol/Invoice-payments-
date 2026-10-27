// Design-system class recipes (tokens live in app/globals.css).
export const input =
  'w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] shadow-[var(--shadow-xs)] outline-none transition placeholder:text-[var(--text-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:shadow-[var(--ring)]';
export const label = 'mb-1.5 block text-xs font-medium text-[var(--text-muted)]';
export const card = 'animate-in rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-6';
export const btn =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-xs)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-high)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--on-accent)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';
export const btnSm =
  'inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-high)] disabled:opacity-40';
