/**
 * Local follow-up reminders for unpaid invoices (iOS app only). Pure planning logic; the
 * scheduling itself happens in components/native/NativeBridge.tsx with @capacitor/local-notifications.
 * Lock-screen text never includes amounts.
 */
export interface ReminderInvoice {
  id: string;
  invoiceNumber: string;
  clientName?: string;
  status: string;
  dueDate: string; // ISO date
}

export interface PlannedReminder {
  id: number;
  title: string;
  body: string;
  at: Date;
  path: string;
}

export const MAX_REMINDERS = 20;
export const REMINDER_HOUR = 9;
const DAY = 86_400_000;
const CLOSED = new Set(['paid', 'void', 'draft', 'cancelled', 'canceled']);

/** Stable positive 31-bit id per invoice + kind, so re-planning replaces rather than duplicates. */
export function reminderId(invoiceId: string, kind: 'overdue' | 'due'): number {
  let h = kind === 'overdue' ? 7 : 13;
  for (const ch of invoiceId) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 2_000_000_000) + 1;
}

function atHour(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function startOfDay(d: Date): Date {
  return atHour(d, 0);
}

export function planInvoiceReminders(invoices: ReminderInvoice[], now: Date = new Date()): PlannedReminder[] {
  const today = startOfDay(now);
  const nextMorning = (() => {
    const t = atHour(now, REMINDER_HOUR);
    return t > now ? t : new Date(t.getTime() + DAY);
  })();
  const out: PlannedReminder[] = [];
  for (const inv of invoices) {
    if (CLOSED.has(inv.status)) continue;
    const due = new Date(inv.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    const dueDay = startOfDay(due);
    const who = inv.clientName ? ` for ${inv.clientName}` : '';
    const path = `/invoices/${encodeURIComponent(inv.id)}`;
    if (dueDay < today || inv.status === 'overdue') {
      const days = Math.max(1, Math.round((today.getTime() - dueDay.getTime()) / DAY));
      out.push({
        id: reminderId(inv.id, 'overdue'),
        title: `Invoice ${inv.invoiceNumber} is overdue`,
        body: `${days} day${days === 1 ? '' : 's'} past due${who}. Tap to follow up.`,
        at: nextMorning,
        path,
      });
    } else if (dueDay.getTime() - today.getTime() <= 7 * DAY) {
      const at = atHour(dueDay, REMINDER_HOUR);
      out.push({
        id: reminderId(inv.id, 'due'),
        title: `Invoice ${inv.invoiceNumber} is due today`,
        body: `Payment${who} is due today. Tap to check its status.`,
        at: at > now ? at : nextMorning,
        path,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_REMINDERS);
}
