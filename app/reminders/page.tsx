'use client';

import { Sidebar } from '@/components/Sidebar';
import { DemoBanner } from '@/components/DemoBanner';
import { PayScoreBadge } from '@/components/PayScoreBadge';
import { COLORS, CURRENCY_SYMBOLS } from '@/lib/constants';
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

  return (
    <div className="flex min-h-screen" style={{ background: COLORS.background }}>
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen overflow-y-auto">
        <div className="p-8 max-w-4xl">
          <h1
            className="text-4xl font-black mb-2"
            style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
          >
            Smart Reminders
          </h1>
          <p className="text-sm mb-8" style={{ color: COLORS.textMuted }}>
            AI-timed follow-ups based on Pay Score™ — not generic blast emails. Connect Resend
            in Settings for live sends (free tier: 3,000/mo).
          </p>

          <DemoBanner mode={mode} />

          <div
            className="rounded-lg border p-6 mb-8 grid grid-cols-3 gap-4"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            {[
              { icon: Mail, label: 'Email', desc: 'Resend API' },
              { icon: MessageSquare, label: 'SMS', desc: 'Coming soon' },
              { icon: Bell, label: 'In-app', desc: 'Always on' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center">
                <Icon size={28} className="mx-auto mb-2" style={{ color: COLORS.accent }} />
                <p className="font-bold text-sm" style={{ color: COLORS.text }}>
                  {label}
                </p>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {loading && <p style={{ color: COLORS.textMuted }}>Loading…</p>}

          <div className="space-y-4">
            {actionable.map((inv) => {
              const plan = reminderPlan(inv);
              return (
                <div
                  key={inv.id}
                  className="rounded-lg border p-6"
                  style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
                >
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="font-mono font-bold" style={{ color: COLORS.accent }}>
                      {inv.invoiceNumber}
                    </span>
                    <span style={{ color: COLORS.text }}>{inv.clientName}</span>
                    <span className="font-mono text-sm" style={{ color: COLORS.text }}>
                      {CURRENCY_SYMBOLS[inv.currency]}
                      {inv.total.toLocaleString()}
                    </span>
                    {inv.payScore != null && <PayScoreBadge score={inv.payScore} />}
                  </div>
                  <ul className="space-y-2">
                    {plan.map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm py-2 border-b last:border-0"
                        style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
                      >
                        <Bell size={14} style={{ color: COLORS.accent, flexShrink: 0 }} />
                        <span>
                          <strong style={{ color: COLORS.text }}>{step.day}</strong> ·{' '}
                          {step.channel} — {step.tone}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {actionable.length === 0 && !loading && (
            <p style={{ color: COLORS.textMuted }}>No outstanding invoices need reminders.</p>
          )}
        </div>
      </main>
    </div>
  );
}
