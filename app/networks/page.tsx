'use client';

import { NETWORKS } from '@/lib/constants';
import { CheckCircle, Clock, Globe } from 'lucide-react';
import { Page, PageHeader, Panel, Pill } from '@/components/ui/kit';
import { useState } from 'react';

export default function NetworksPage() {
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);

  const live = NETWORKS.filter((n: any) => n.status === 'live');
  const beta = NETWORKS.filter((n: any) => n.status === 'beta');

  const details: Record<string, { regions: string[] }> = {
    PEPPOL: { regions: ['40+ EU Countries', 'Norway', 'Iceland', 'UK'] },
    ZUGFeRD: { regions: ['Germany'] },
    'NF-e': { regions: ['Brazil'] },
    'JP e-Invoice': { regions: ['Japan'] },
    'AU RCTI': { regions: ['Australia'] },
  };

  const card = (network: any, soon: boolean) => {
    const on = selectedNetwork === network.id;
    return (
      <button type="button" key={network.id} onClick={() => setSelectedNetwork(on ? null : network.id)} aria-pressed={on}
        className={`flex flex-col rounded-[var(--radius-lg)] border bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-xs)] transition hover:border-[var(--border-strong)] ${on ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)]'}`}>
        <span className="flex items-start justify-between gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Globe size={17} /></span>
          <Pill tone={soon ? 'warning' : 'violet'}>{soon ? 'Beta' : 'Roadmap'}</Pill>
        </span>
        <span className="mt-3 font-semibold text-[var(--text)]">{network.name}</span>
        <span className="mt-1 text-sm text-[var(--text-muted)]">{network.description}</span>
        {on && details[network.id] && (
          <span className="mt-3 flex flex-wrap gap-1.5">{details[network.id].regions.map((r) => <span key={r} className="rounded-full bg-[var(--surface-high)] px-2 py-0.5 text-xs text-[var(--text-muted)]">{r}</span>)}</span>
        )}
      </button>
    );
  };
  return (
    <Page>
      <PageHeader eyebrow="Grow" title="E-invoice networks" subtitle="Planned integrations. Network delivery is not available yet — tap a network to see regions." />
      <Panel title={<span className="flex items-center gap-2"><CheckCircle size={16} className="text-[var(--accent)]" />Planned networks</span>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{live.map((n: any) => card(n, false))}</div>
      </Panel>
      {beta.length > 0 && (
        <div className="mt-5"><Panel title={<span className="flex items-center gap-2"><Clock size={16} className="text-[var(--warning)]" />Coming soon</span>}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{beta.map((n: any) => card(n, true))}</div>
        </Panel></div>
      )}
    </Page>
  );
}
