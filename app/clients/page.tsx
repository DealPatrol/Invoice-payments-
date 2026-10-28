'use client';

import { useEffect, useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { Mail, Users } from 'lucide-react';
import { Avatar, DataList, EmptyState, LinkButton, Page, PageHeader, Panel, Pill, SearchInput, SkeletonRows, Toolbar } from '@/components/ui/kit';

interface Client { id: string | number; name: string; email: string; country: string; currency: string }

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'demo' | 'postgres'>('demo');

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((data) => {
      setClients(data.clients ?? []);
      setMode(data.mode ?? 'postgres');
    }).finally(() => setLoading(false));
  }, []);

  const s = search.toLowerCase();
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s));

  return (
    <Page>
      <PageHeader title="Clients" subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'} · contact details and billing currency`} actions={<LinkButton href="/studio?tab=clients">Manage in Studio</LinkButton>} />
      <DemoBanner mode={mode} />
      <Panel flush>
        <div className="border-b border-[var(--border)] p-4"><Toolbar><SearchInput value={search} onChange={setSearch} placeholder="Search name or email" /></Toolbar></div>
        {loading ? <SkeletonRows /> : filtered.length === 0 ? (
          <EmptyState icon={Users} title={search ? 'No matching clients' : 'No clients yet'} body={search ? 'Try another name or email.' : 'Clients appear here when you invoice them.'} />
        ) : (
          <DataList rows={filtered} rowKey={(c) => c.id}
            columns={[
              { header: 'Client', cell: (c) => <span className="flex items-center gap-2.5"><Avatar name={c.name} /><span className="font-semibold">{c.name}</span></span> },
              { header: 'Email', cell: (c) => <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-[var(--accent)] hover:underline"><Mail size={13} />{c.email}</a> },
              { header: 'Country', cell: (c) => <span className="text-[var(--text-muted)]">{c.country}</span> },
              { header: 'Currency', align: 'right', cell: (c) => <Pill>{c.currency}</Pill> },
            ]}
            mobile={(c) => (
              <div className="flex items-center gap-3">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-[var(--text)]">{c.name}</p><a href={`mailto:${c.email}`} className="truncate text-xs text-[var(--accent)]">{c.email}</a></div>
                <Pill>{c.currency}</Pill>
              </div>
            )} />
        )}
      </Panel>
    </Page>
  );
}
