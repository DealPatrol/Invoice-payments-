import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { useApp } from './store';
import type { DisplayStatus } from './lib/calc';

export function Screen({ title, children, action, back = true }: { title: string; children: ReactNode; action?: ReactNode; back?: boolean }) {
  const { back: goBack } = useApp();
  return (
    <section className="screen" aria-label={title}>
      <header className="topbar">
        {back ? (
          <button className="link-btn" onClick={goBack} aria-label="Back">
            ‹ Back
          </button>
        ) : (
          <span />
        )}
        <h1>{title}</h1>
        <div className="topbar-action">{action}</div>
      </header>
      <div className="content">{children}</div>
    </section>
  );
}

export function Field({ label, hint, ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input {...rest} />
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function Area({ label, ...rest }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea rows={3} {...rest} />
    </label>
  );
}

export function Btn({ kind = 'primary', ...rest }: { kind?: 'primary' | 'secondary' | 'danger' | 'ghost' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={`btn btn-${kind} ${rest.className ?? ''}`} />;
}

export function Card({ children, onClick, label }: { children: ReactNode; onClick?: () => void; label?: string }) {
  if (onClick)
    return (
      <button className="card card-btn" onClick={onClick} aria-label={label}>
        {children}
      </button>
    );
  return <div className="card">{children}</div>;
}

const STATUS_LABEL: Record<DisplayStatus, string> = { draft: 'Draft', sent: 'Sent', overdue: 'Overdue', paid: 'Paid', partial: 'Partly paid', accepted: 'Accepted', declined: 'Declined' };

export function StatusPill({ s }: { s: DisplayStatus }) {
  return <span className={`pill pill-${s}`}>{STATUS_LABEL[s]}</span>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
