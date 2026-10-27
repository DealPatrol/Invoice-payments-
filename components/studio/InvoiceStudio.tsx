'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3, Bell, Building2, Copy, CreditCard, Download, FilePlus2, FileSpreadsheet, FileText, Link2, Package,
  Pencil, Plus, Printer, Repeat, Save, ScrollText, Trash2, Upload, Users, X, ArrowRightLeft, ExternalLink,
} from 'lucide-react';
import { InvoiceDocument } from './InvoiceDocument';
import { CatalogPanel, ClientsPanel, Dashboard, StatusBadge } from './StudioPanels';
import { btn, btnPrimary, btnSm, card, input, label } from './ui';
import {
  addDays, calcTotals, decodeInvoice, encodeInvoice, formatInvoiceNumber, formatMoney, formatDate,
  loadCatalog, loadClients, loadInvoices, loadProfile, newInvoice, newLineItem, saveCatalog, saveClients,
  saveInvoices, saveProfile, lineTotal, todayISO, uid,
  STUDIO_CURRENCIES, TERMS_OPTIONS, UNIT_SUGGESTIONS, DEFAULT_PROFILE,
  type BusinessProfile, type CatalogItem, type DocKind, type EstimateStatus, type RecurringInterval,
  type StudioClient, type StudioInvoice, type StudioLineItem, type StudioStatus,
} from '@/lib/studio';
import {
  advanceDate, convertEstimate, displayStatus, generateDueRecurring, invoicesToCSV, recordPayment, reminderDraft, removePayment,
} from '@/lib/studio-ops';

type Tab = 'dashboard' | 'edit' | 'invoices' | 'estimates' | 'clients' | 'items' | 'profile';

function download(name: string, content: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
}

export function InvoiceStudio() {
  const params = useSearchParams();
  const shared = params.get('doc');
  const printOnly = params.get('print') === '1';
  const clientView = params.get('view') === '1';
  const initialTab = params.get('tab') as Tab | null;

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [invoices, setInvoices] = useState<StudioInvoice[]>([]);
  const [clients, setClients] = useState<StudioClient[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState<StudioInvoice | null>(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [reminder, setReminder] = useState<ReturnType<typeof reminderDraft> | null>(null);
  const [pay, setPay] = useState({ amount: '', date: todayISO(), method: 'Cash', reference: '' });
  const today = todayISO();

  useEffect(() => {
    // Hydrate from localStorage after mount (not available during SSR).
    /* eslint-disable react-hooks/set-state-in-effect */
    let p = loadProfile();
    let list = loadInvoices();
    // Catch up recurring schedules: creates drafts only, never sends anything.
    const due = generateDueRecurring(list, p, todayISO());
    if (due.created.length) {
      list = due.invoices; p = due.profile;
      saveInvoices(list); saveProfile(p);
      setToast(`${due.created.length} recurring invoice draft(s) created`);
    }
    setProfile(p);
    setInvoices(list);
    setClients(loadClients());
    setCatalog(loadCatalog());
    const fromLink = shared ? decodeInvoice(shared) : null;
    setDraft(fromLink ?? newInvoice(p));
    if (fromLink) setTab('edit');
    else if (!localStorage.getItem('invoiceos.studio.profile.v1')) setTab('profile');
    if (initialTab) setTab(initialTab);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [shared, initialTab]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  }, []);

  const totals = useMemo(() => (draft ? calcTotals(draft) : null), [draft]);

  if (!ready || !draft || !totals) return <div className="p-8 text-[var(--text-muted)]">Loading studio…</div>;

  if (printOnly) {
    return <div className="print-reset min-h-screen bg-white"><InvoiceDocument invoice={draft} /></div>;
  }

  const docWord = draft.kind === 'estimate' ? 'Estimate' : 'Invoice';
  const printPdf = (inv = draft) => {
    const prev = document.title;
    document.title = `${inv.business.name} - ${inv.kind === 'estimate' ? 'Estimate' : 'Invoice'} ${inv.number}`;
    window.print();
    document.title = prev;
  };
  const shareUrl = (inv: StudioInvoice) => `${window.location.origin}/studio?view=1&doc=${encodeInvoice(inv)}`;

  if (clientView) {
    const st = displayStatus(draft, today);
    const payUrl = draft.paymentLink || draft.business.paymentLinkUrl;
    const startCheckout = async () => {
      const res = await fetch('/api/studio/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc: shared }) });
      const data = await res.json().catch(() => ({}));
      if (data.url) window.location.href = data.url; else flash(data.error || 'Online payment unavailable');
    };
    return (
      <div className="print-reset min-h-screen bg-[#f3f4f6] p-3 sm:p-8">
        <div className="no-print mx-auto mb-4 flex max-w-[860px] flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <div className="text-sm text-gray-500">{draft.business.name} sent you {draft.kind === 'estimate' ? 'an estimate' : 'an invoice'}</div>
            <div className="text-2xl font-black text-gray-900">
              {formatMoney(draft.kind === 'estimate' ? totals.total : totals.balanceDue, draft.business.currency)}
              <span className="ml-2 align-middle"><StatusBadge status={st} /></span>
            </div>
            {draft.kind === 'invoice' && <div className="text-sm text-gray-500">Due {formatDate(draft.dueDate)}</div>}
            {params.get('paid') === '1' && <div className="text-sm font-semibold text-green-600">Thanks! Your payment was received.</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800" onClick={() => printPdf()}><Download size={16} />Download PDF</button>
            {draft.kind === 'invoice' && totals.balanceDue > 0 && (payUrl
              ? <a href={payUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white" style={{ background: draft.business.accentColor }}><CreditCard size={16} />Pay now</a>
              : <button onClick={startCheckout} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white" style={{ background: draft.business.accentColor }}><CreditCard size={16} />Pay by card</button>)}
          </div>
        </div>
        <div className="mx-auto max-w-[860px] overflow-x-auto"><InvoiceDocument invoice={draft} /></div>
        {toast && <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">{toast}</div>}
      </div>
    );
  }

  /* ---------- state helpers ---------- */
  const update = (patch: Partial<StudioInvoice>) => setDraft({ ...draft, ...patch, updatedAt: new Date().toISOString() });
  const updateCustomer = (patch: Partial<StudioInvoice['customer']>) => update({ customer: { ...draft.customer, ...patch } });
  const updateItem = (id: string, patch: Partial<StudioLineItem>) =>
    update({ items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const persistProfile = (p: BusinessProfile) => { setProfile(p); saveProfile(p); };
  const persistInvoices = (list: StudioInvoice[]) => { setInvoices(list); saveInvoices(list); };
  const persistClients = (list: StudioClient[]) => { setClients(list); saveClients(list); };
  const persistCatalog = (list: CatalogItem[]) => { setCatalog(list); saveCatalog(list); };

  /** Upsert an invoice in the saved list; returns the new list. */
  const commit = (inv: StudioInvoice, list = invoices) => {
    const exists = list.some((i) => i.id === inv.id);
    const next = exists ? list.map((i) => (i.id === inv.id ? inv : i)) : [inv, ...list];
    persistInvoices(next);
    if (draft.id === inv.id) setDraft(inv);
    return { next, exists };
  };

  const bumpNumber = (inv: StudioInvoice, p = profile) => {
    if (inv.kind === 'estimate' && inv.number === formatInvoiceNumber(p.estimatePrefix, p.nextEstimateNumber)) {
      return { ...p, nextEstimateNumber: p.nextEstimateNumber + 1 };
    }
    if (inv.kind === 'invoice' && inv.number === formatInvoiceNumber(p.invoicePrefix, p.nextNumber)) {
      return { ...p, nextNumber: p.nextNumber + 1 };
    }
    return p;
  };

  const saveDraft = () => {
    let inv = draft;
    // Auto-add the customer to the client list.
    if (inv.customer.name.trim() && !inv.clientId) {
      const match = clients.find((c) => c.name.trim().toLowerCase() === inv.customer.name.trim().toLowerCase());
      if (match) inv = { ...inv, clientId: match.id };
      else {
        const c: StudioClient = { ...inv.customer, id: uid(), notes: '', createdAt: new Date().toISOString() };
        persistClients([c, ...clients]);
        inv = { ...inv, clientId: c.id };
      }
    }
    const { exists } = commit(inv);
    if (!exists) persistProfile(bumpNumber(inv));
    flash(`Saved ${inv.number}`);
  };

  const startNew = (kind: DocKind = 'invoice', client?: StudioClient) => {
    const inv = newInvoice(profile, kind);
    if (client) { inv.customer = { name: client.name, company: client.company, email: client.email, phone: client.phone, address: client.address }; inv.clientId = client.id; }
    setDraft(inv);
    setTab('edit');
  };

  const duplicate = (inv: StudioInvoice) => {
    const fresh = newInvoice(profile, inv.kind);
    setDraft({ ...inv, id: fresh.id, number: fresh.number, status: 'draft', estimateStatus: 'draft', issueDate: fresh.issueDate,
      dueDate: addDays(fresh.issueDate, inv.termsDays), amountPaid: 0, payments: [], recurring: null, sentAt: '', remindersSent: [],
      convertedFromId: '', convertedToId: '', business: { ...profile }, createdAt: fresh.createdAt, updatedAt: fresh.updatedAt });
    setTab('edit');
    flash('Duplicated — remember to save');
  };

  const remove = (id: string) => {
    if (!confirm('Delete this document from this device?')) return;
    persistInvoices(invoices.filter((i) => i.id !== id));
    if (draft.id === id) setDraft(newInvoice(profile));
  };

  const convert = (est: StudioInvoice) => {
    const inv = convertEstimate(est, profile, today);
    const { next } = commit({ ...est, estimateStatus: 'converted', convertedToId: inv.id });
    commit(inv, next);
    persistProfile(bumpNumber(inv));
    setDraft(inv);
    setTab('edit');
    flash(`Converted ${est.number} → ${inv.number}`);
  };

  const addPayment = () => {
    try {
      const inv = recordPayment(draft, { amount: Number(pay.amount), date: pay.date, method: pay.method, reference: pay.reference });
      commit(inv);
      setPay({ ...pay, amount: '', reference: '' });
      flash('Payment recorded');
    } catch (e) { flash(e instanceof Error ? e.message : 'Invalid payment'); }
  };

  const copyLink = async (inv = draft) => {
    await navigator.clipboard.writeText(shareUrl(inv)).catch(() => undefined);
    flash('Client view link copied');
  };

  const markSent = (inv: StudioInvoice) => {
    const now = new Date().toISOString();
    commit(inv.kind === 'estimate' ? { ...inv, estimateStatus: 'sent', sentAt: now } : { ...inv, status: inv.status === 'draft' ? 'sent' : inv.status, sentAt: now });
    flash('Marked as sent (nothing was emailed)');
  };

  const exportData = () => download(`invoice-studio-backup-${today}.json`, JSON.stringify({ version: 2, profile, invoices, clients, catalog }, null, 2), 'application/json');
  const importData = (file: File) => {
    file.text().then((txt) => {
      try {
        const data = JSON.parse(txt);
        if (data.profile) persistProfile({ ...DEFAULT_PROFILE, ...data.profile });
        if (Array.isArray(data.invoices)) { saveInvoices(data.invoices); setInvoices(loadInvoices()); }
        if (Array.isArray(data.clients)) persistClients(data.clients);
        if (Array.isArray(data.catalog)) persistCatalog(data.catalog);
        flash('Backup restored');
      } catch { flash('Could not read that file'); }
    });
  };
  const onLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => persistProfile({ ...profile, logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const openDoc = (inv: StudioInvoice) => { setDraft(inv); setTab('edit'); };
  const saved = invoices.some((i) => i.id === draft.id);
  const status = displayStatus(draft, today);
  const invoiceList = invoices.filter((i) => i.kind === 'invoice');
  const estimateList = invoices.filter((i) => i.kind === 'estimate');

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'edit', label: `Edit ${docWord.toLowerCase()}`, icon: Pencil },
    { id: 'invoices', label: `Invoices (${invoiceList.length})`, icon: FileText },
    { id: 'estimates', label: `Estimates (${estimateList.length})`, icon: ScrollText },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'profile', label: 'Business', icon: Building2 },
  ];

  const renderDocList = (kind: DocKind) => {
    const list = (kind === 'invoice' ? invoiceList : estimateList)
      .filter((i) => `${i.number} ${i.customer.name} ${i.customer.company}`.toLowerCase().includes(query.toLowerCase()));
    return (
      <div className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-[var(--text)]">{kind === 'invoice' ? 'Invoices' : 'Estimates'}</h2>
          <div className="flex gap-2">
            <button className={btn} onClick={() => download(`${kind}s-${today}.csv`, invoicesToCSV(list, today), 'text/csv')}><FileSpreadsheet size={16} />CSV</button>
            <button className={btnPrimary} onClick={() => startNew(kind)}><Plus size={16} />New</button>
          </div>
        </div>
        <input className={input + ' mb-2'} placeholder="Search by number or customer" value={query} onChange={(e) => setQuery(e.target.value)} />
        {list.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nothing here yet.</p>}
        <ul className="divide-y divide-[var(--border)]">
          {list.map((inv) => {
            const t = calcTotals(inv);
            return (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <button className="min-w-0 text-left" onClick={() => openDoc(inv)}>
                  <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
                    {inv.number} · {inv.customer.name || 'No customer'} <StatusBadge status={displayStatus(inv, today)} />
                    {inv.recurring?.active && <Repeat size={13} className="text-[var(--accent)]" aria-label="Recurring" />}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {formatDate(inv.issueDate)} · {kind === 'invoice' ? 'due' : 'valid until'} {formatDate(inv.dueDate)} · {formatMoney(t.total, inv.business.currency)}
                    {kind === 'invoice' && t.amountPaid > 0 && t.balanceDue > 0 ? ` · ${formatMoney(t.balanceDue, inv.business.currency)} left` : ''}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {kind === 'estimate' && inv.estimateStatus !== 'converted' && <button className={btnSm} onClick={() => convert(inv)}><ArrowRightLeft size={13} />Invoice</button>}
                  <button title="Copy client link" className="text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => copyLink(inv)}><Link2 size={16} /></button>
                  <button title="Duplicate" className="text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => duplicate(inv)}><Copy size={16} /></button>
                  <button title="Delete" className="text-[var(--danger)]" onClick={() => remove(inv.id)}><Trash2 size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const showPreview = tab === 'edit';

  return (
    <div className="print-reset p-4 sm:p-6 lg:p-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Invoice Studio</h1>
          <p className="text-sm text-[var(--text-muted)]">Invoices, estimates, clients and payments for any business. Saved on this device — back up anytime.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => startNew('estimate')}><ScrollText size={16} />New estimate</button>
          <button className={btnPrimary} onClick={() => startNew('invoice')}><FilePlus2 size={16} />New invoice</button>
        </div>
      </div>

      <div className="no-print mb-5 flex gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 lg:w-fit">
        {tabs.map(({ id, label: l, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'}`}>
            <Icon size={15} />{l}
          </button>
        ))}
      </div>

      <div className={showPreview ? 'grid gap-6 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]' : 'mx-auto max-w-4xl'}>
        <div className="no-print space-y-4">
          {tab === 'dashboard' && <Dashboard invoices={invoices} today={today} currency={profile.currency} onOpen={openDoc} />}
          {tab === 'invoices' && renderDocList('invoice')}
          {tab === 'estimates' && renderDocList('estimate')}
          {tab === 'clients' && <ClientsPanel clients={clients} invoices={invoices} onChange={persistClients} onNewFor={(c) => startNew('invoice', c)} />}
          {tab === 'items' && <CatalogPanel items={catalog} currency={profile.currency} onChange={persistCatalog} />}

          {tab === 'profile' && (
            <div className={card}>
              <h2 className="mb-1 font-bold text-[var(--text)]">Business profile</h2>
              <p className="mb-4 text-sm text-[var(--text-muted)]">Used on every new invoice and estimate.</p>
              <div className="mb-4 flex items-center gap-4">
                {profile.logoDataUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={profile.logoDataUrl} alt="logo" className="h-16 w-16 rounded-lg bg-white object-contain" />
                  : <div className="grid h-16 w-16 place-items-center rounded-lg text-2xl font-black text-white" style={{ background: profile.accentColor }}>{profile.name.charAt(0)}</div>}
                <label className={btn + ' cursor-pointer'}><Upload size={16} />Logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
                </label>
                {profile.logoDataUrl && <button className={btn} onClick={() => persistProfile({ ...profile, logoDataUrl: '' })}>Remove</button>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['name', 'Business name'], ['tagline', 'Tagline / services'], ['ownerName', 'Owner / contact'],
                  ['phone', 'Phone'], ['email', 'Email'], ['website', 'Website'], ['taxId', 'Tax ID / EIN (optional)'],
                  ['invoicePrefix', 'Invoice prefix'], ['estimatePrefix', 'Estimate prefix'],
                ] as const).map(([key, l]) => (
                  <div key={key}><label className={label}>{l}</label>
                    <input className={input} value={profile[key]} onChange={(e) => persistProfile({ ...profile, [key]: e.target.value })} /></div>
                ))}
                <div><label className={label}>Next invoice #</label>
                  <input type="number" className={input} value={profile.nextNumber} onChange={(e) => persistProfile({ ...profile, nextNumber: Number(e.target.value) || 1 })} /></div>
                <div><label className={label}>Next estimate #</label>
                  <input type="number" className={input} value={profile.nextEstimateNumber} onChange={(e) => persistProfile({ ...profile, nextEstimateNumber: Number(e.target.value) || 1 })} /></div>
                <div><label className={label}>Currency</label>
                  <select className={input} value={profile.currency} onChange={(e) => persistProfile({ ...profile, currency: e.target.value })}>
                    {STUDIO_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select></div>
                <div><label className={label}>Default terms</label>
                  <select className={input} value={profile.defaultTermsDays} onChange={(e) => persistProfile({ ...profile, defaultTermsDays: Number(e.target.value) })}>
                    {TERMS_OPTIONS.map((t) => <option key={t.days} value={t.days}>{t.label}</option>)}
                  </select></div>
                <div><label className={label}>Default tax %</label>
                  <input type="number" step="0.01" className={input} value={profile.defaultTaxRate} onChange={(e) => persistProfile({ ...profile, defaultTaxRate: Number(e.target.value) || 0 })} /></div>
                <div><label className={label}>Brand color</label>
                  <input type="color" className={input + ' h-10 p-1'} value={profile.accentColor} onChange={(e) => persistProfile({ ...profile, accentColor: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className={label}>Tax presets</label>
                  <div className="space-y-2">
                    {profile.taxPresets.map((t, i) => (
                      <div key={i} className="flex gap-2">
                        <input className={input} placeholder="Name (e.g. GA sales tax)" value={t.name}
                          onChange={(e) => persistProfile({ ...profile, taxPresets: profile.taxPresets.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                        <input type="number" step="0.001" className={input + ' w-28'} value={t.rate}
                          onChange={(e) => persistProfile({ ...profile, taxPresets: profile.taxPresets.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) } : x)) })} />
                        <button aria-label="Remove preset" className="text-[var(--danger)]" onClick={() => persistProfile({ ...profile, taxPresets: profile.taxPresets.filter((_, j) => j !== i) })}><X size={16} /></button>
                      </div>
                    ))}
                    <button className={btnSm} onClick={() => persistProfile({ ...profile, taxPresets: [...profile.taxPresets, { name: '', rate: 0 }] })}><Plus size={13} />Preset</button>
                  </div></div>
                <div className="sm:col-span-2"><label className={label}>Default online payment link (e.g. Stripe Payment Link)</label>
                  <input className={input} placeholder="https://buy.stripe.com/test_…" value={profile.paymentLinkUrl} onChange={(e) => persistProfile({ ...profile, paymentLinkUrl: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className={label}>Address</label>
                  <textarea rows={2} className={input} value={profile.address} onChange={(e) => persistProfile({ ...profile, address: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className={label}>Default payment instructions</label>
                  <textarea rows={2} className={input} placeholder="e.g. Cash, check payable to …, Venmo @…, Zelle …" value={profile.paymentInstructions}
                    onChange={(e) => persistProfile({ ...profile, paymentInstructions: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className={label}>Default notes</label>
                  <textarea rows={2} className={input} value={profile.defaultNotes} onChange={(e) => persistProfile({ ...profile, defaultNotes: e.target.value })} /></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={btnPrimary} onClick={() => { setDraft({ ...draft, business: { ...profile } }); setTab('edit'); flash('Profile applied to current document'); }}>Apply to current document</button>
                <button className={btn} onClick={exportData}><Download size={16} />Backup (JSON)</button>
                <label className={btn + ' cursor-pointer'}><Upload size={16} />Restore
                  <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
                </label>
              </div>
            </div>
          )}

          {tab === 'edit' && (
            <>
              <div className={card + ' flex flex-wrap items-center justify-between gap-2'}>
                <div className="flex items-center gap-2 font-bold text-[var(--text)]">{docWord} {draft.number} <StatusBadge status={status} />{!saved && <span className="text-xs font-normal text-[var(--text-muted)]">unsaved</span>}</div>
                <div className="flex flex-wrap gap-2">
                  <button className={btnSm} onClick={saveDraft}><Save size={13} />Save</button>
                  <button className={btnSm} onClick={() => copyLink()}><Link2 size={13} />Client link</button>
                  <a className={btnSm} href={shareUrl(draft)} target="_blank" rel="noreferrer"><ExternalLink size={13} />Preview</a>
                  <button className={btnSm} onClick={() => printPdf()}><Printer size={13} />PDF</button>
                  <button className={btnSm} onClick={() => markSent(draft)}>Mark sent</button>
                  {draft.kind === 'invoice' && draft.status !== 'draft' && totals.balanceDue > 0 && (
                    <button className={btnSm} onClick={() => setReminder(reminderDraft(draft, today, shareUrl(draft)))}><Bell size={13} />Reminder</button>
                  )}
                  {draft.kind === 'estimate' && draft.estimateStatus !== 'converted' && (
                    <button className={btnSm} onClick={() => convert(draft)}><ArrowRightLeft size={13} />Convert to invoice</button>
                  )}
                </div>
              </div>

              <div className={card}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={label}>{docWord} #</label><input className={input} value={draft.number} onChange={(e) => update({ number: e.target.value })} /></div>
                  <div><label className={label}>Status</label>
                    {draft.kind === 'invoice' ? (
                      <select className={input} value={draft.status} onChange={(e) => update({ status: e.target.value as StudioStatus })}>
                        <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="void">Void</option>
                      </select>
                    ) : (
                      <select className={input} value={draft.estimateStatus} onChange={(e) => update({ estimateStatus: e.target.value as EstimateStatus })}>
                        <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="converted">Invoiced</option>
                      </select>
                    )}</div>
                  <div><label className={label}>Issue date</label>
                    <input type="date" className={input} value={draft.issueDate} onChange={(e) => update({ issueDate: e.target.value, dueDate: addDays(e.target.value, draft.termsDays) })} /></div>
                  <div><label className={label}>{draft.kind === 'estimate' ? 'Valid for' : 'Terms'}</label>
                    <select className={input} value={draft.termsDays} onChange={(e) => { const d = Number(e.target.value); update({ termsDays: d, dueDate: addDays(draft.issueDate, d) }); }}>
                      {TERMS_OPTIONS.map((t) => <option key={t.days} value={t.days}>{t.label}</option>)}
                    </select></div>
                  <div><label className={label}>{draft.kind === 'estimate' ? 'Valid until' : 'Due date'}</label><input type="date" className={input} value={draft.dueDate} onChange={(e) => update({ dueDate: e.target.value })} /></div>
                  <div><label className={label}>Service date (optional)</label><input type="date" className={input} value={draft.serviceDate} onChange={(e) => update({ serviceDate: e.target.value })} /></div>
                  <div><label className={label}>PO / Job # (optional)</label><input className={input} value={draft.poNumber} onChange={(e) => update({ poNumber: e.target.value })} /></div>
                  <div><label className={label}>Currency</label>
                    <select className={input} value={draft.business.currency} onChange={(e) => update({ business: { ...draft.business, currency: e.target.value } })}>
                      {STUDIO_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                    </select></div>
                </div>
              </div>

              <div className={card}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-[var(--text)]">Bill to</h2>
                  {clients.length > 0 && (
                    <select className={input + ' w-auto'} value={draft.clientId} onChange={(e) => {
                      const c = clients.find((x) => x.id === e.target.value);
                      if (c) update({ clientId: c.id, customer: { name: c.name, company: c.company, email: c.email, phone: c.phone, address: c.address } });
                    }}>
                      <option value="">Choose saved client…</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={label}>Customer name</label><input className={input} value={draft.customer.name} onChange={(e) => updateCustomer({ name: e.target.value })} /></div>
                  <div><label className={label}>Company</label><input className={input} value={draft.customer.company} onChange={(e) => updateCustomer({ company: e.target.value })} /></div>
                  <div><label className={label}>Email</label><input type="email" className={input} value={draft.customer.email} onChange={(e) => updateCustomer({ email: e.target.value })} /></div>
                  <div><label className={label}>Phone</label><input className={input} value={draft.customer.phone} onChange={(e) => updateCustomer({ phone: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={label}>Address</label><textarea rows={2} className={input} value={draft.customer.address} onChange={(e) => updateCustomer({ address: e.target.value })} /></div>
                </div>
              </div>

              <div className={card}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-[var(--text)]">Line items</h2>
                  {catalog.length > 0 && (
                    <select className={input + ' w-auto'} value="" onChange={(e) => {
                      const c = catalog.find((x) => x.id === e.target.value);
                      if (!c) return;
                      const blank = draft.items.length === 1 && !draft.items[0].description && !draft.items[0].unitPrice;
                      const item = newLineItem({ description: c.name, details: c.details, unit: c.unit, unitPrice: c.unitPrice });
                      update({ items: blank ? [item] : [...draft.items, item] });
                    }}>
                      <option value="">+ Add from catalog…</option>
                      {catalog.map((c) => <option key={c.id} value={c.id}>{c.name} — {formatMoney(c.unitPrice, draft.business.currency)}</option>)}
                    </select>
                  )}
                </div>
                <datalist id="units">{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
                <div className="space-y-3">
                  {draft.items.map((item, idx) => (
                    <div key={item.id} className="rounded-lg border border-[var(--border)] p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Item {idx + 1}</span>
                        <span className="flex items-center gap-3">
                          {item.description && !catalog.some((c) => c.name === item.description) && (
                            <button className="underline" onClick={() => { persistCatalog([{ id: uid(), name: item.description, details: item.details, unit: item.unit, unitPrice: item.unitPrice, taxable: true }, ...catalog]); flash('Saved to catalog'); }}>Save to catalog</button>
                          )}
                          <span className="font-semibold text-[var(--text)]">{formatMoney(lineTotal(item), draft.business.currency)}</span>
                        </span>
                      </div>
                      <input className={input + ' mb-2'} placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                      <input className={input + ' mb-2'} placeholder="Details (optional)" value={item.details} onChange={(e) => updateItem(item.id, { details: e.target.value })} />
                      <div className="grid grid-cols-[1fr_1fr_1.3fr_auto] gap-2">
                        <input type="number" step="any" className={input} aria-label="Quantity" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} />
                        <input list="units" className={input} placeholder="Unit" value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })} />
                        <input type="number" step="0.01" className={input} aria-label="Unit price" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} />
                        <button className="px-2 text-[var(--danger)] disabled:opacity-30" disabled={draft.items.length === 1}
                          onClick={() => update({ items: draft.items.filter((i) => i.id !== item.id) })} aria-label="Remove item"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className={btn + ' mt-3'} onClick={() => update({ items: [...draft.items, newLineItem()] })}><Plus size={16} />Add item</button>
              </div>

              <div className={card}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={label}>Discount</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" className={input} value={draft.discountValue} onChange={(e) => update({ discountValue: Number(e.target.value) })} />
                      <select className={input + ' w-20'} value={draft.discountType} onChange={(e) => update({ discountType: e.target.value as 'percent' | 'amount' })}>
                        <option value="percent">%</option><option value="amount">$</option>
                      </select>
                    </div></div>
                  <div><label className={label}>Tax %</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" className={input} value={draft.taxRate} onChange={(e) => update({ taxRate: Number(e.target.value) })} />
                      {profile.taxPresets.length > 0 && (
                        <select className={input + ' w-28'} value="" aria-label="Tax preset" onChange={(e) => e.target.value !== '' && update({ taxRate: Number(e.target.value) })}>
                          <option value="">Preset</option>
                          {profile.taxPresets.map((t, i) => <option key={i} value={t.rate}>{t.name} ({t.rate}%)</option>)}
                        </select>
                      )}
                    </div></div>
                  <div><label className={label}>Shipping / delivery</label><input type="number" step="0.01" className={input} value={draft.shipping} onChange={(e) => update({ shipping: Number(e.target.value) })} /></div>
                  {draft.kind === 'invoice' && (
                    <div><label className={label}>Online payment link (this invoice)</label>
                      <input className={input} placeholder={profile.paymentLinkUrl || 'https://buy.stripe.com/test_…'} value={draft.paymentLink} onChange={(e) => update({ paymentLink: e.target.value })} /></div>
                  )}
                  <div className="sm:col-span-2"><label className={label}>Payment instructions</label><textarea rows={2} className={input} value={draft.paymentInstructions} onChange={(e) => update({ paymentInstructions: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={label}>Notes</label><textarea rows={2} className={input} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} /></div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--surface-high)] px-4 py-3">
                  <span className="text-sm text-[var(--text-muted)]">{draft.kind === 'estimate' ? 'Estimate total' : 'Balance due'}</span>
                  <span className="text-xl font-black text-[var(--text)]">{formatMoney(draft.kind === 'estimate' ? totals.total : totals.balanceDue, draft.business.currency)}</span>
                </div>
              </div>

              {draft.kind === 'invoice' && (
                <div className={card}>
                  <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--text)]"><CreditCard size={16} />Payments</h2>
                  {draft.payments.length === 0 && draft.amountPaid === 0 && <p className="mb-3 text-sm text-[var(--text-muted)]">No payments yet. Record deposits and partial payments here.</p>}
                  {draft.amountPaid > 0 && <p className="mb-2 text-sm text-[var(--text-muted)]">Earlier deposit: {formatMoney(draft.amountPaid, draft.business.currency)}</p>}
                  <ul className="mb-3 divide-y divide-[var(--border)]">
                    {draft.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-[var(--text)]">{formatDate(p.date)} · {p.method}{p.reference ? ` #${p.reference}` : ''}</span>
                        <span className="flex items-center gap-3 font-semibold text-[#22c97a]">{formatMoney(p.amount, draft.business.currency)}
                          <button aria-label="Remove payment" className="text-[var(--danger)]" onClick={() => commit(removePayment(draft, p.id))}><X size={14} /></button></span>
                      </li>
                    ))}
                  </ul>
                  {totals.balanceDue > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                      <input type="number" step="0.01" className={input} placeholder={`Amount (${totals.balanceDue})`} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
                      <input type="date" className={input} value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
                      <select className={input} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                        {['Cash', 'Check', 'Card', 'Stripe', 'ACH', 'Venmo', 'Zelle', 'Cash App', 'PayPal', 'Other'].map((m) => <option key={m}>{m}</option>)}
                      </select>
                      <input className={input} placeholder="Ref / check #" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
                      <button className={btnPrimary + ' justify-center'} onClick={addPayment}>Record</button>
                      <button className={btnSm + ' col-span-2 w-fit sm:col-span-5'} onClick={() => setPay({ ...pay, amount: String(totals.balanceDue) })}>Fill full balance</button>
                    </div>
                  )}
                </div>
              )}

              {draft.kind === 'invoice' && (
                <div className={card}>
                  <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--text)]"><Repeat size={16} />Recurring</h2>
                  <label className="mb-3 flex items-center gap-2 text-sm text-[var(--text)]">
                    <input type="checkbox" checked={Boolean(draft.recurring?.active)} onChange={(e) => update({
                      recurring: e.target.checked
                        ? { interval: draft.recurring?.interval ?? 'monthly', nextDate: draft.recurring?.nextDate || advanceDate(draft.issueDate, draft.recurring?.interval ?? 'monthly'), endDate: draft.recurring?.endDate ?? '', active: true }
                        : draft.recurring ? { ...draft.recurring, active: false } : null,
                    })} />
                    Repeat this invoice automatically (creates drafts for you to review — never emails anyone)
                  </label>
                  {draft.recurring?.active && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div><label className={label}>Every</label>
                        <select className={input} value={draft.recurring.interval} onChange={(e) => update({ recurring: { ...draft.recurring!, interval: e.target.value as RecurringInterval } })}>
                          {['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'].map((i) => <option key={i} value={i}>{i}</option>)}
                        </select></div>
                      <div><label className={label}>Next invoice</label><input type="date" className={input} value={draft.recurring.nextDate} onChange={(e) => update({ recurring: { ...draft.recurring!, nextDate: e.target.value } })} /></div>
                      <div><label className={label}>End (optional)</label><input type="date" className={input} value={draft.recurring.endDate} onChange={(e) => update({ recurring: { ...draft.recurring!, endDate: e.target.value } })} /></div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {showPreview && <div className="print-reset overflow-x-auto"><InvoiceDocument invoice={draft} /></div>}
      </div>

      {reminder && (
        <div className="no-print fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setReminder(null)}>
          <div className={card + ' w-full max-w-lg'} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-[var(--text)]">Reminder draft</h2><button aria-label="Close" onClick={() => setReminder(null)}><X size={18} /></button></div>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Nothing is sent automatically. Copy this or open it in your own email app.</p>
            <label className={label}>To</label><input className={input + ' mb-2'} value={reminder.to} readOnly />
            <label className={label}>Subject</label><input className={input + ' mb-2'} value={reminder.subject} onChange={(e) => setReminder({ ...reminder, subject: e.target.value })} />
            <label className={label}>Message</label><textarea rows={10} className={input} value={reminder.body} onChange={(e) => setReminder({ ...reminder, body: e.target.value })} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={btnPrimary} onClick={async () => { await navigator.clipboard.writeText(`${reminder.subject}\n\n${reminder.body}`).catch(() => undefined); commit({ ...draft, remindersSent: [...draft.remindersSent, today] }); flash('Copied'); }}><Copy size={16} />Copy</button>
              <a className={btn} href={`mailto:${encodeURIComponent(reminder.to)}?subject=${encodeURIComponent(reminder.subject)}&body=${encodeURIComponent(reminder.body)}`}>Open in my email app</a>
            </div>
            {draft.remindersSent.length > 0 && <p className="mt-2 text-xs text-[var(--text-muted)]">Reminders logged: {draft.remindersSent.map(formatDate).join(', ')}</p>}
          </div>
        </div>
      )}

      {toast && <div className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </div>
  );
}
