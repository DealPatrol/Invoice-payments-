'use client';

import { DemoBanner } from '@/components/DemoBanner';
import { PayScoreBadge } from '@/components/PayScoreBadge';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { Avatar, EmptyState, Page, PageHeader, Panel, Pill, SkeletonRows, StatusPill } from '@/components/ui/kit';
import { useInvoices } from '@/lib/hooks';
import { Bell, Mail, MessageSquare } from 'lucide-react';

/** Smart reminder schedules — unique vs basic invoice apps */
function reminderPlan(invoice: {
  status: string;
  dueDate: string;
  payScore?: number;
}) {
  const days = Math.ceil(
    (new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (invoice.status === 'paid') return [];
  if (invoice.status === 'overdue') {
    return [
      { day: 'Today', channel: 'email', tone: 'Firm + late fee notice' },
      { day: 'In 3 days', channel: 'email', tone: 'Final notice' },
    ];
  }
  if (days <= 3) {
    return [
      { day: 'Today', channel: 'email', tone: 'Friendly due-soon' },
      { day: 'On due date', channel: 'email', tone: 'Pay now + portal link' },
    ];
  }
  if ((invoice.payScore ?? 70) < 60) {
    return [
      { day: 'Today', channel: 'email', tone: 'Early nudge (low pay score)' },
      { day: `7 days before due`, channel: 'email', tone: 'Reminder' },
      { day: 'On due date', channel: 'email', tone: 'Due today' },
    ];
  }
  return [
    { day: '7 days before due', channel: 'email', tone: 'Upcoming invoice' },
    { day: 'On due date', channel: 'email', tone: 'Payment due' },
  ];
}

export default function RemindersPage() {
  const { invoices, mode, loading } = useInvoices({ status: 'all' });
  const actionable = invoices.filter((i) => i.status !== 'paid' && i.status !== 'draft');

  const overdue = actionable.filter((i) => i.status === 'overdue').length;
  return (
    <Page>
      <PageHeader eyebrow="Grow" title="Smart reminders" subtitle="Automatic due-date and overdue follow-ups, including configured late fees." />
      <DemoBanner mode={mode} />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          { icon: Mail, label: 'Email', desc: 'Sent via Resend', tone: 'success' as const, state: 'Active' },
          { icon: Bell, label: 'In-app', desc: 'Always on', tone: 'success' as const, state: 'Active' },
          { icon: MessageSquare, label: 'SMS', desc: 'On the roadmap', tone: 'neutral' as const, state: 'Soon' },
        ].map(({ icon: Icon, label, desc, tone, state }) => (
          <div key={label} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={18} /></span>
            <span className="flex-1"><span className="block font-semibold text-[var(--text)]">{label}</span><span className="text-xs text-[var(--text-muted)]">{desc}</span></span>
            <Pill tone={tone}>{state}</Pill>
          </div>
        ))}
      </div>
      <Panel title={<span>Scheduled follow-ups <span className="font-normal text-[var(--text-subtle)]">· {actionable.length} invoices{overdue ? `, ${overdue} overdue` : ''}</span></span>} flush>
        {loading ? <SkeletonRows rows={3} /> : actionable.length === 0 ? (
          <EmptyState icon={Bell} title="All caught up" body="No outstanding invoices need reminders." />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {actionable.map((inv) => (
              <li key={inv.id} className="p-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={inv.clientName} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[var(--text)]">{inv.clientName}</span><span className="text-xs text-[var(--text-muted)]">{inv.invoiceNumber}</span></span>
                  {inv.payScore != null && <PayScoreBadge score={inv.payScore} />}
                  <StatusPill status={inv.status} />
                  <span className="tabular font-semibold text-[var(--text)]">{CURRENCY_SYMBOLS[inv.currency]}{inv.total.toLocaleString()}</span>
                </div>
                <ol className="mt-3 flex flex-wrap gap-2 sm:pl-12">
                  {reminderPlan(inv).map((step, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-high)] px-3 py-1 text-xs text-[var(--text-muted)]">
                      <Bell size={12} className="text-[var(--accent)]" /><b className="font-semibold text-[var(--text)]">{step.day}</b>{step.tone}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
