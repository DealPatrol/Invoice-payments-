// Payment Reminder System

export interface ReminderRule {
  id: string;
  name: string;
  daysBeforeDue: number;
  frequency: 'once' | 'daily' | 'weekly';
  enabled: boolean;
  template: string;
}

export interface ReminderHistory {
  invoiceId: string;
  reminderSent: Date;
  medium: 'email' | 'sms' | 'in-app';
  recipient: string;
}

// Default reminder rules
export const DEFAULT_REMINDER_RULES: ReminderRule[] = [
  {
    id: '1',
    name: 'Due Soon Reminder',
    daysBeforeDue: 3,
    frequency: 'once',
    enabled: true,
    template:
      'Your invoice {invoice_number} is due in 3 days. Please ensure payment by {due_date}.',
  },
  {
    id: '2',
    name: 'Payment Overdue Reminder',
    daysBeforeDue: 0,
    frequency: 'daily',
    enabled: true,
    template:
      'Invoice {invoice_number} is now overdue. Immediate payment is required. Amount due: {amount}',
  },
  {
    id: '3',
    name: 'Follow-up Reminder',
    daysBeforeDue: -7,
    frequency: 'weekly',
    enabled: true,
    template:
      'This is a follow-up reminder: Invoice {invoice_number} is {days_overdue} days overdue. Please settle your account.',
  },
];

export function calculateNextReminderDate(
  dueDate: Date,
  daysBeforeDue: number,
  frequency: 'once' | 'daily' | 'weekly'
): Date {
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - daysBeforeDue);

  if (frequency === 'daily' || frequency === 'weekly') {
    const now = new Date();
    if (reminderDate < now) {
      if (frequency === 'daily') {
        reminderDate.setDate(reminderDate.getDate() + 1);
      } else {
        reminderDate.setDate(reminderDate.getDate() + 7);
      }
    }
  }

  return reminderDate;
}

export function interpolateReminderTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });
  return result;
}

export function shouldSendReminder(invoiceStatus: string, lastReminderSent?: Date): boolean {
  // Don't send reminders for paid invoices
  if (invoiceStatus === 'paid') return false;

  // Don't send reminders for draft invoices
  if (invoiceStatus === 'draft') return false;

  // Always send if no previous reminder
  if (!lastReminderSent) return true;

  // Check if enough time has passed since last reminder
  const daysSinceLastReminder = Math.floor(
    (Date.now() - lastReminderSent.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceLastReminder >= 1;
}

export function getOverdueStatus(dueDate: Date): {
  isOverdue: boolean;
  daysOverdue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const now = new Date();
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) {
    return { isOverdue: false, daysOverdue: 0, severity: 'low' };
  }

  let severity: 'low' | 'medium' | 'high' | 'critical';
  if (daysOverdue > 60) {
    severity = 'critical';
  } else if (daysOverdue > 30) {
    severity = 'high';
  } else if (daysOverdue > 14) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  return { isOverdue: true, daysOverdue, severity };
}

export function generateReminderBatch(
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    dueDate: Date;
    status: string;
    clientEmail: string;
    amount: number;
  }>,
  rules: ReminderRule[]
): Array<{
  invoiceId: string;
  reminderRuleId: string;
  message: string;
  recipient: string;
  sendAt: Date;
}> {
  const batch: Array<{
    invoiceId: string;
    reminderRuleId: string;
    message: string;
    recipient: string;
    sendAt: Date;
  }> = [];

  invoices.forEach((invoice) => {
    rules.forEach((rule) => {
      if (!rule.enabled) return;

      const reminderDate = calculateNextReminderDate(
        new Date(invoice.dueDate),
        rule.daysBeforeDue,
        rule.frequency
      );

      const shouldSend = shouldSendReminder(invoice.status);

      if (shouldSend) {
        const message = interpolateReminderTemplate(rule.template, {
          invoice_number: invoice.invoiceNumber,
          due_date: new Date(invoice.dueDate).toLocaleDateString(),
          amount: invoice.amount,
          days_overdue: Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            )
          ),
        });

        batch.push({
          invoiceId: invoice.id,
          reminderRuleId: rule.id,
          message,
          recipient: invoice.clientEmail,
          sendAt: reminderDate,
        });
      }
    });
  });

  return batch;
}
