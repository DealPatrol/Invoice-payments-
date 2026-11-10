'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Page, PageHeader } from '@/components/ui/kit';
import { JOB_STATUSES } from '@/lib/field-types';
import { statusLabel } from '@/lib/estimate-domain';
import { fieldClass, labelClass } from './ui';

interface ClientOption {
  id: string | number;
  name: string;
  email: string;
  country: string;
  currency: string;
}

export function JobForm() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [fresh, setFresh] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');
  const [title, setTitle] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<(typeof JOB_STATUSES)[number]>('open');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/clients').then((response) => response.json()).then((data) => {
      const list = (data.clients ?? []) as ClientOption[];
      setClients(list);
      if (list[0]) setClientId(String(list[0].id));
    }).catch(() => setError('Clients could not be loaded'));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          siteAddress,
          status,
          scheduledAt: scheduledAt || null,
          ...(fresh ? { client: { name, email, country, currency } } : { clientId }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create the job');
      router.push(`/jobs/${data.job.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create the job');
      setSaving(false);
    }
  }

  return (
    <Page narrow>
      <PageHeader eyebrow="Field work" title="New job" subtitle="The site and the client. Estimates and invoices attach here." />
      <form onSubmit={onSubmit} className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
        <label className="block"><span className={labelClass}>Job title</span><input required className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Backyard privacy fence" /></label>
        <label className="block"><span className={labelClass}>Site address</span><input className={fieldClass} value={siteAddress} onChange={(event) => setSiteAddress(event.target.value)} placeholder="Street, city" /></label>
        <label className="block"><span className={labelClass}>What the customer wants</span><textarea className={`${fieldClass} min-h-24`} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={labelClass}>Status</span>
            <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value as (typeof JOB_STATUSES)[number])}>
              {JOB_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
            </select>
          </label>
          <label className="block"><span className={labelClass}>Scheduled</span><input type="date" className={fieldClass} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={labelClass}>Client</span>
          <button type="button" className="text-xs font-semibold text-[var(--accent)]" onClick={() => setFresh((value) => !value)}>{fresh ? 'Use an existing client' : 'New client'}</button>
        </div>
        {fresh ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className={labelClass}>Name</span><input required className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="block sm:col-span-2"><span className={labelClass}>Email</span><input required type="email" className={fieldClass} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="block"><span className={labelClass}>Country</span><input required className={fieldClass} value={country} onChange={(event) => setCountry(event.target.value)} /></label>
            <label className="block"><span className={labelClass}>Currency</span><input required maxLength={3} className={fieldClass} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
          </div>
        ) : (
          <select required className={fieldClass} value={clientId} onChange={(event) => setClientId(event.target.value)}>
            {clients.map((client) => <option key={client.id} value={String(client.id)}>{client.name}</option>)}
          </select>
        )}
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center rounded-[10px] bg-[var(--accent)] px-3.5 py-3 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50 sm:w-auto">{saving ? 'Saving…' : 'Create job'}</button>
      </form>
    </Page>
  );
}
