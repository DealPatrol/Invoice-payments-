import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { appUrl, isDemoMode } from '@/lib/config';
import { prisma } from '@/lib/db';

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isDemoMode()) {
    return NextResponse.json({ sent: 0, skipped: 'demo mode' });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json({ error: 'Resend is not configured' }, { status: 503 });
  }

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['sent', 'pending', 'overdue'] },
      dueDate: { lt: dayEnd },
      client: { email: { not: { endsWith: '@no-email.invoiceos' } } },
      reminderLogs: { none: { sentAt: { gte: dayStart, lt: dayEnd } } },
    },
    include: { client: true },
  });

  const resend = new Resend(apiKey);
  let sent = 0;
  const failures: string[] = [];
  for (const invoice of invoices) {
    const overdue = invoice.dueDate < dayStart;
    const lateFee = overdue ? invoice.total * (invoice.lateFeePercent / 100) : 0;
    const amountDue = invoice.total + lateFee;
    const kind = overdue ? 'overdue' : 'due';
    const subject = overdue
      ? `Invoice ${invoice.invoiceNumber} is overdue`
      : `Invoice ${invoice.invoiceNumber} is due today`;
    try {
      const result = await resend.emails.send({
        from,
        to: invoice.client.email,
        subject,
        text: [
          `Hello ${invoice.client.name},`,
          '',
          `${subject}.`,
          `Amount due: ${invoice.currency} ${amountDue.toFixed(2)}`,
          lateFee > 0
            ? `This includes a ${invoice.lateFeePercent}% late fee (${invoice.currency} ${lateFee.toFixed(2)}).`
            : '',
          `Pay securely: ${appUrl()}/pay/${invoice.payToken}`,
        ].filter(Boolean).join('\n'),
      });
      if (result.error) throw new Error(result.error.message);
      await prisma.$transaction([
        prisma.reminderLog.create({
          data: {
            invoiceId: invoice.id,
            kind,
            sentTo: invoice.client.email,
          },
        }),
        prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            lastReminderAt: now,
            ...(overdue ? { status: 'overdue' } : {}),
          },
        }),
      ]);
      sent += 1;
    } catch (error) {
      failures.push(
        `${invoice.invoiceNumber}: ${error instanceof Error ? error.message : 'send failed'}`
      );
    }
  }

  return NextResponse.json({ sent, failed: failures.length, failures });
}
