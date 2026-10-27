/**
 * Email provider abstraction for sending Studio invoices.
 * OFF by default: requires STUDIO_EMAIL_ENABLED=true. Provider chosen by STUDIO_EMAIL_PROVIDER
 * (resend | agentmail | log). 'log' (default) never contacts anyone.
 * STUDIO_EMAIL_ALLOWLIST (comma-separated) restricts recipients while testing.
 */
export interface OutgoingEmail { to: string; subject: string; text: string; html?: string; replyTo?: string }
export interface EmailProvider { name: string; send(msg: OutgoingEmail): Promise<{ id: string }> }

export const logProvider: EmailProvider = {
  name: 'log',
  async send(msg) {
    console.info('[studio-mail:log] would send', { to: msg.to, subject: msg.subject });
    return { id: `log_${Date.now()}` };
  },
};

function resendProvider(): EmailProvider {
  return {
    name: 'resend',
    async send(msg) {
      const key = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM_EMAIL;
      if (!key || !from) throw new Error('Resend is not configured');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html, reply_to: msg.replyTo }),
      });
      if (!res.ok) throw new Error(`Resend error ${res.status}`);
      const data = await res.json();
      return { id: data.id };
    },
  };
}

function agentmailProvider(): EmailProvider {
  return {
    name: 'agentmail',
    async send(msg) {
      const key = process.env.AGENTMAIL_API_KEY;
      const inbox = process.env.AGENTMAIL_INBOX_ID;
      if (!key || !inbox) throw new Error('AgentMail is not configured');
      const res = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html, reply_to: msg.replyTo }),
      });
      if (!res.ok) throw new Error(`AgentMail error ${res.status}`);
      const data = await res.json();
      return { id: data.message_id ?? data.id };
    },
  };
}

export function emailEnabled() {
  return process.env.STUDIO_EMAIL_ENABLED === 'true';
}

export function getEmailProvider(): EmailProvider {
  switch (process.env.STUDIO_EMAIL_PROVIDER) {
    case 'resend': return resendProvider();
    case 'agentmail': return agentmailProvider();
    default: return logProvider;
  }
}

export function recipientAllowed(to: string): boolean {
  const list = (process.env.STUDIO_EMAIL_ALLOWLIST ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.length === 0 || list.includes(to.trim().toLowerCase());
}

export async function sendStudioEmail(msg: OutgoingEmail, provider = getEmailProvider()) {
  if (!emailEnabled()) throw new Error('Email sending is disabled (set STUDIO_EMAIL_ENABLED=true).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.to)) throw new Error('Invalid recipient');
  if (!recipientAllowed(msg.to)) throw new Error('Recipient is not on STUDIO_EMAIL_ALLOWLIST');
  return provider.send(msg);
}
