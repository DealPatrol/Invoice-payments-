'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3, Bell, Building2, Copy, CreditCard, Download, FilePlus2, FileSpreadsheet, FileText, Link2, Package,
  Mail, Pencil, Clock, Calculator, Plus, Cloud, CloudOff, Printer, Repeat, Save, ScrollText, Trash2, Upload, Users, X, ArrowRightLeft, ExternalLink,
} from 'lucide-react';
import { InvoiceDocument } from './InvoiceDocument';
import { CatalogPanel, ClientsPanel, Dashboard, StatusBadge } from './StudioPanels';
import { BrandSwitcher, ExpensesTimePanel, PortalCard, TaxReportPanel, TrackingCard } from './SuitePanels';
import { DEFAULT_EXTRAS, billToInvoice, ensureBrands, loadExtras, normalizeExtras, saveExtras, syncActiveBrand, type StudioExtras } from '@/lib/studio-suite';
import { Avatar, DataList, EmptyState, Panel, SearchInput, Segmented, StatusPill, Toolbar } from '@/components/ui/kit';
import { btn, btnPrimary, btnSm, card, input, label } from './ui';
import {
  addDays, calcTotals, decodeInvoice, encodeInvoice, formatInvoiceNumber, formatMoney, formatDate,
  loadCatalog, loadClients, loadInvoices, loadProfile, newInvoice, newLineItem, saveCatalog, saveClients,
  saveInvoices, saveProfile, lineTotal, todayISO, uid,
  STUDIO_CURRENCIES, TERMS_OPTIONS, UNIT_SUGGESTIONS, DEFAULT_PROFILE,
  type BusinessProfile, type CatalogItem, type DocKind, type EstimateStatus, type RecurringInterval,
  type StudioClient, type StudioInvoice, type StudioLineItem, type StudioStatus, INVOICE_TEMPLATES } from '@/lib/studio';
import {
  advanceDate, amountDue, convertEstimate, displayStatus, generateDueRecurring, invoicesToCSV, recordPayment, reminderDraft, removePayment,
} from '@/lib/studio-ops';

type Tab = 'dashboard' | 'edit' | 'invoices' | 'estimates' | 'clients' | 'items' | 'work' | 'tax' | 'profile';

function download(name: string, content: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
}

const LOGO_MAX_EDGE = 256;
const LOGO_PASSTHROUGH_BYTES = 40 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

/** Shrink phone photos before they are copied into the profile and every invoice snapshot. */
async function logoDataUrlFromFile(file: File): Promise<string> {
  if (file.size > 0 && file.size <= LOGO_PASSTHROUGH_BYTES) return readAsDataUrl(file);
  const img = await loadImage(file);
  const edge = Math.max(img.naturalWidth, img.naturalHeight);
  if (!edge) throw new Error('Could not read image');
  const scale = Math.min(1, LOGO_MAX_EDGE / edge);
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read image');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 48000 && quality > 0.5) {
    quality -= 0.16;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrl.length > 48000) throw new Error('logo too large');
  return dataUrl;
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
  const [extras, setExtras] = useState<StudioExtras>(DEFAULT_EXTRAS);
  const [draft, setDraft] = useState<StudioInvoice | null>(null);
  const [toast, setToast] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [reminder, setReminder] = useState<ReturnType<typeof reminderDraft> | null>(null);
  const [pay, setPay] = useState({ amount: '', date: todayISO(), method: 'Cash', reference: '' });
  const today = todayISO();
  // Cloud sync: 'local' = no DB configured, 'signedout' = DB but no session, 'on' = synced to account.
  const [cloud, setCloud] = useState<'checking' | 'local' | 'signedout' | 'on'>('checking');
  const skipPush = useRef(true);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const x = ensureBrands(loadExtras(), p);
    saveExtras(x); setExtras(x);
    const fromLink = shared ? decodeInvoice(shared) : null;
    setDraft(fromLink ?? { ...newInvoice(p), brandId: x.activeBrandId });
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

  useEffect(() => {
    if (!ready || clientView || printOnly) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/studio/sync', { cache: 'no-store' }).catch(() => null);
      if (cancelled) return;
      if (!res || res.status === 503) return setCloud('local');
      if (res.status === 401) return setCloud('signedout');
      if (!res.ok) return setCloud('local');
      let server = await res.json();
      const migratedKey = 'invoiceos.studio.cloudMigrated.v1';
      if (!localStorage.getItem(migratedKey)) {
        // First sign-in on this browser: copy local documents into the account (never deletes server data).
        const serverIds = new Set((server.invoices as StudioInvoice[]).map((i) => i.id));
        const localOnly = loadInvoices().filter((i) => !serverIds.has(i.id));
        if (localOnly.length || !server.profile) {
          const merged = {
            profile: server.profile ?? loadProfile(),
            clients: [...server.clients, ...loadClients().filter((c) => !server.clients.some((s: StudioClient) => s.id === c.id))],
            catalog: [...server.catalog, ...loadCatalog().filter((c) => !server.catalog.some((s: CatalogItem) => s.id === c.id))],
            invoices: [...server.invoices, ...localOnly],
            extras: server.extras && Object.keys(server.extras).length ? server.extras : loadExtras(),
            prune: false,
          };
          const put = await fetch('/api/studio/sync', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) });
          if (put.ok) server = await put.json();
          if (localOnly.length) flash(`Moved ${localOnly.length} document(s) from this browser to your account`);
        }
        localStorage.setItem(migratedKey, new Date().toISOString());
      }
      if (cancelled) return;
      skipPush.current = true;
      if (server.profile) { setProfile(server.profile); saveProfile(server.profile); }
      setInvoices(server.invoices); saveInvoices(server.invoices);
      setClients(server.clients); saveClients(server.clients);
      setCatalog(server.catalog); saveCatalog(server.catalog);
      if (server.extras && Object.keys(server.extras).length) { const sx = ensureBrands(normalizeExtras(server.extras), server.profile ?? loadProfile()); setExtras(sx); saveExtras(sx); }
      setCloud('on');
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const pushNow = useCallback(async () => {
    const res = await fetch('/api/studio/sync', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, invoices, clients, catalog, extras }),
    }).catch(() => null);
    return res?.ok ?? false;
  }, [profile, invoices, clients, catalog, extras]);

  useEffect(() => {
    if (cloud !== 'on') return;
    if (skipPush.current) { skipPush.current = false; return; }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => { void pushNow(); }, 800);
    return () => { if (pushTimer.current) clearTimeout(pushTimer.current); };
  }, [cloud, pushNow]);

  const totals = useMemo(() => (draft ? calcTotals(draft) : null), [draft]);

  if (!ready || !draft || !totals) return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-10" aria-busy="true" aria-label="Loading studio">
      <div className="skeleton h-8 w-56" /><div className="skeleton h-10 w-full max-w-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-24" />)}</div>
      <div className="skeleton h-64" />
    </div>
  );

  if (printOnly) {
    return <div className="print-reset min-h-screen bg-white"><InvoiceDocument invoice={draft} today={today} /></div>;
  }

  const docWord = draft.kind === 'estimate' ? 'Estimate' : 'Invoice';
  const lateFeeNow = amountDue(draft, today) - totals.balanceDue;
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
    return (
      <div className="print-reset min-h-screen bg-[var(--canvas)] p-3 sm:p-8">
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
            {draft.kind === 'invoice' && totals.balanceDue > 0 && payUrl && (
              <a href={payUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white" style={{ background: draft.business.accentColor }}><CreditCard size={16} />Pay now</a>)}
          </div>
        </div>
        <div className="mx-auto max-w-[860px] overflow-x-auto"><InvoiceDocument invoice={draft} today={today} /></div>
        {toast && <div role="status" className="no-print animate-in fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-lg)]">{toast}</div>}
      </div>
    );
  }

  /* ---------- state helpers ---------- */
  const update = (patch: Partial<StudioInvoice>) => setDraft({ ...draft, ...patch, updatedAt: new Date().toISOString() });
  const updateCustomer = (patch: Partial<StudioInvoice['customer']>) => update({ customer: { ...draft.customer, ...patch } });
  const updateItem = (id: string, patch: Partial<StudioLineItem>) =>
    update({ items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const persistExtras = (x: StudioExtras) => { if (!saveExtras(x)) flash('Could not save on this device (storage full)'); setExtras(x); };
  const persistProfile = (p: BusinessProfile) => {
    if (!saveProfile(p)) flash('Could not save on this device (storage full)');
    setProfile(p);
    setExtras((x) => { const nx = syncActiveBrand(x, p); saveExtras(nx); return nx; });
  };
  const switchBrand = (id: string) => {
    const b = extras.brands.find((x) => x.id === id);
    if (!b) return;
    const nx = { ...syncActiveBrand(extras, profile), activeBrandId: id };
    persistExtras(nx); saveProfile(b.profile); setProfile(b.profile);
    setDraft({ ...newInvoice(b.profile), brandId: id });
    flash(`Switched to ${b.profile.name || 'business'}`);
  };
  const addBrand = () => {
    const id = uid();
    const p = { ...profile, name: 'New business', tagline: '', logoDataUrl: '', paymentLinkUrl: '', nextNumber: 1001, invoicePrefix: 'NB-' };
    const nx = { ...syncActiveBrand(extras, profile), brands: [...extras.brands, { id, profile: p }], activeBrandId: id };
    persistExtras(nx); saveProfile(p); setProfile(p); setDraft({ ...newInvoice(p), brandId: id }); setTab('profile');
  };
  const billWork = (expenseIds: string[], timeIds: string[]) => {
    if (!draft) return;
    const out = billToInvoice(draft, extras, expenseIds, timeIds);
    setDraft(out.invoice); persistExtras(out.extras); setTab('edit');
    flash(`Added ${expenseIds.length + timeIds.length} item(s) — save the invoice to keep them`);
  };
  const copyPortal = async (c: StudioClient) => {
    const res = await fetch('/api/studio/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: c.email }) }).catch(() => null);
    if (!res?.ok) return flash('Could not create a portal link (sign in first)');
    const { url } = await res.json();
    try { await navigator.clipboard.writeText(url); flash(`Portal link for ${c.name} copied`); } catch { window.prompt('Copy this link:', url); }
  };
  const persistInvoices = (list: StudioInvoice[]) => { if (!saveInvoices(list)) flash('Could not save on this device (storage full)'); setInvoices(list); };
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
    const inv = { ...newInvoice(profile, kind), brandId: extras.activeBrandId };
    if (client) { inv.customer = { name: client.name, company: client.company, email: client.email, phone: client.phone, address: client.address }; inv.clientId = client.id; }
    setDraft(inv);
    setTab('edit');
  };

  const duplicate = (inv: StudioInvoice) => {
    const fresh = newInvoice(profile, inv.kind);
    setDraft({ ...inv, id: fresh.id, number: fresh.number, status: 'draft', estimateStatus: 'draft', issueDate: fresh.issueDate,
      dueDate: addDays(fresh.issueDate, inv.termsDays), amountPaid: 0, payments: [], recurring: null, sentAt: '', remindersSent: [], shareToken: '', clientResponse: undefined,
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

  /** Secure server link when signed in (amount verified server-side); offline link otherwise. */
  const secureLink = async (inv: StudioInvoice): Promise<string | null> => {
    if (cloud !== 'on') return null;
    if (!invoices.some((i) => i.id === inv.id)) { flash('Save the document first'); return ''; }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    await pushNow();
    const res = await fetch('/api/studio/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: inv.id }) });
    const data = await res.json().catch(() => ({}));
    if (!data.url) { flash(data.error || 'Could not create link'); return ''; }
    return data.url as string;
  };

  const copyLink = async (inv = draft) => {
    const secure = await secureLink(inv);
    if (secure === '') return;
    try {
      await navigator.clipboard.writeText(secure ?? shareUrl(inv));
      flash(secure ? 'Secure client link copied' : 'Client view link copied (offline link — sign in for secure links)');
    } catch { flash(secure ? `Copy this link: ${secure}` : 'Could not copy link'); }
  };

  const sendEmail = async (inv = draft) => {
    if (cloud !== 'on') return flash('Sign in to send email');
    if (!confirm(`Email ${inv.number} to ${inv.customer.email || '(no email)'}?`)) return;
    await pushNow();
    const res = await fetch('/api/studio/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: inv.id }) });
    const data = await res.json().catch(() => ({}));
    if (data.sent) markSent(inv); else flash(data.error || 'Email not sent');
  };

  const markSent = (inv: StudioInvoice) => {
    const now = new Date().toISOString();
    commit(inv.kind === 'estimate' ? { ...inv, estimateStatus: 'sent', sentAt: now } : { ...inv, status: inv.status === 'draft' ? 'sent' : inv.status, sentAt: now });
    flash('Marked as sent (nothing was emailed)');
  };

  const exportData = () => download(`invoice-studio-backup-${today}.json`, JSON.stringify({ version: 3, profile, invoices, clients, catalog, extras: syncActiveBrand(extras, profile) }, null, 2), 'application/json');
  const importData = (file: File) => {
    file.text().then((txt) => {
      try {
        const data = JSON.parse(txt);
        if (data.profile) persistProfile({ ...DEFAULT_PROFILE, ...data.profile });
        if (Array.isArray(data.invoices)) { saveInvoices(data.invoices); setInvoices(loadInvoices()); }
        if (Array.isArray(data.clients)) persistClients(data.clients);
        if (Array.isArray(data.catalog)) persistCatalog(data.catalog);
        if (data.extras) persistExtras(ensureBrands(normalizeExtras(data.extras), loadProfile()));
        flash('Backup restored');
      } catch { flash('Could not read that file'); }
    });
  };
  const onLogo = (file: File) => {
    logoDataUrlFromFile(file)
      // Resize can take seconds; merge into the profile saved since the file was picked.
      .then((logoDataUrl) => { persistProfile({ ...loadProfile(), logoDataUrl }); })
      .catch(() => flash('Could not read that image'));
  };

  const openDoc = (inv: StudioInvoice) => { setDraft(inv); setTab('edit'); };
  const saved = invoices.some((i) => i.id === draft.id);
  const status = displayStatus(draft, today);
  const inBrand = (i: StudioInvoice) => !extras.activeBrandId || !i.brandId || i.brandId === extras.activeBrandId;
  const invoiceList = invoices.filter((i) => i.kind === 'invoice' && inBrand(i));
  const estimateList = invoices.filter((i) => i.kind === 'estimate' && inBrand(i));

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'edit', label: `Edit ${docWord.toLowerCase()}`, icon: Pencil },
    { id: 'invoices', label: `Invoices (${invoiceList.length})`, icon: FileText },
    { id: 'estimates', label: `Estimates (${estimateList.length})`, icon: ScrollText },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'work', label: 'Time & expenses', icon: Clock },
    { id: 'tax', label: 'Tax report', icon: Calculator },
    { id: 'profile', label: 'Business', icon: Building2 },
  ];

  const renderDocList = (kind: DocKind) => {
    const base = (kind === 'invoice' ? invoiceList : estimateList)
      .filter((i) => `${i.number} ${i.customer.name} ${i.customer.company}`.toLowerCase().includes(query.toLowerCase()));
    const stat = (i: StudioInvoice) => String(kind === 'invoice' ? displayStatus(i, today) : i.estimateStatus ?? 'draft');
    const filters = kind === 'invoice' ? ['all', 'draft', 'sent', 'overdue', 'paid'] : ['all', 'draft', 'sent', 'accepted', 'converted'];
    const active = filters.includes(docFilter) ? docFilter : 'all';
    const list = active === 'all' ? base : base.filter((i) => stat(i) === active);
    const word = kind === 'invoice' ? 'invoice' : 'estimate';
    const actions = (inv: StudioInvoice) => (
      <div className="flex items-center justify-end gap-0.5">
        {kind === 'estimate' && inv.estimateStatus !== 'converted' && <button className={btnSm} onClick={() => convert(inv)}><ArrowRightLeft size={13} />Invoice</button>}
        <button title="Copy client link" aria-label={`Copy client link for ${inv.number}`} className="rounded-md p-1.5 text-[var(--text-subtle)] hover:bg-[var(--surface-high)] hover:text-[var(--text)]" onClick={() => copyLink(inv)}><Link2 size={15} /></button>
        <button title="Duplicate" aria-label={`Duplicate ${inv.number}`} className="rounded-md p-1.5 text-[var(--text-subtle)] hover:bg-[var(--surface-high)] hover:text-[var(--text)]" onClick={() => duplicate(inv)}><Copy size={15} /></button>
        <button title="Delete" aria-label={`Delete ${inv.number}`} className="rounded-md p-1.5 text-[var(--text-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" onClick={() => remove(inv.id)}><Trash2 size={15} /></button>
      </div>
    );
    return (
      <Panel flush>
        <div className="space-y-3 border-b border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--text)]">{kind === 'invoice' ? 'Invoices' : 'Estimates'} <span className="font-normal text-[var(--text-subtle)]">· {list.length}</span></h2>
            <div className="flex gap-2">
              <button className={btn} onClick={() => download(`${kind}s-${today}.csv`, invoicesToCSV(list, today), 'text/csv')}><FileSpreadsheet size={16} />CSV</button>
              <button className={btnPrimary} onClick={() => startNew(kind)}><Plus size={16} />New {word}</button>
            </div>
          </div>
          <Toolbar>
            <Segmented value={active} onChange={setDocFilter}
              options={filters.map((f) => ({ value: f, label: f, count: f === 'all' ? base.length : base.filter((i) => stat(i) === f).length }))} />
            <SearchInput value={query} onChange={setQuery} placeholder="Search number or customer" />
          </Toolbar>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={kind === 'invoice' ? FileText : ScrollText} title={query || active !== 'all' ? `No matching ${word}s` : `No ${word}s yet`}
            body={query || active !== 'all' ? 'Try a different filter or search.' : kind === 'invoice' ? 'Create an invoice in under a minute and share a pay link.' : 'Send an estimate, then turn it into an invoice in one click.'}
            action={<button className={btnPrimary} onClick={() => startNew(kind)}><Plus size={16} />New {word}</button>} />
        ) : (
          <DataList rows={list} rowKey={(r) => r.id}
            columns={[
              { header: 'Number', cell: (inv) => <button className="font-semibold text-[var(--accent)] hover:underline" onClick={() => openDoc(inv)}>{inv.number}</button> },
              { header: 'Customer', cell: (inv) => <span className="flex items-center gap-2.5"><Avatar name={inv.customer.name || '?'} /><span>{inv.customer.name || 'No customer'}{inv.recurring?.active && <Repeat size={12} className="ml-1.5 inline text-[var(--accent)]" aria-label="Recurring" />}</span></span> },
              { header: 'Issued', cell: (inv) => <span className="text-[var(--text-muted)]">{formatDate(inv.issueDate)}</span> },
              { header: kind === 'invoice' ? 'Due' : 'Valid until', cell: (inv) => <span className="text-[var(--text-muted)]">{formatDate(inv.dueDate)}</span> },
              { header: 'Status', cell: (inv) => kind === 'invoice' ? <StatusBadge status={displayStatus(inv, today)} /> : <StatusPill status={stat(inv)} /> },
              { header: 'Amount', align: 'right', cell: (inv) => { const t = calcTotals(inv); return <span><span className="font-semibold">{formatMoney(t.total, inv.business.currency)}</span>{kind === 'invoice' && t.amountPaid > 0 && t.balanceDue > 0 && <span className="block text-xs text-[var(--text-muted)]">{formatMoney(t.balanceDue, inv.business.currency)} left</span>}</span>; } },
              { header: '', align: 'right', cell: actions },
            ]}
            mobile={(inv) => (
              <div className="flex items-center gap-3">
                <Avatar name={inv.customer.name || '?'} />
                <button className="min-w-0 flex-1 text-left" onClick={() => openDoc(inv)}>
                  <p className="truncate font-semibold text-[var(--text)]">{inv.number} · {inv.customer.name || 'No customer'}</p>
                  <p className="text-xs text-[var(--text-muted)]">{kind === 'invoice' ? 'Due' : 'Valid until'} {formatDate(inv.dueDate)}</p>
                </button>
                <div className="flex flex-col items-end gap-1">
                  <span className="tabular font-semibold text-[var(--text)]">{formatMoney(calcTotals(inv).total, inv.business.currency)}</span>
                  {kind === 'invoice' ? <StatusBadge status={displayStatus(inv, today)} /> : <StatusPill status={stat(inv)} />}
                </div>
              </div>
            )} />
        )}
      </Panel>
    );
  };


  const showPreview = tab === 'edit';

  return (
    <div className="print-reset mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-10">
      <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-[1.75rem]">Invoice Studio
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cloud === 'on' ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--surface-high)] text-[var(--text-muted)]'}`}>
              {cloud === 'on' ? <><Cloud size={12} />Synced to account</> : <><CloudOff size={12} />{cloud === 'signedout' ? 'Not signed in — this device only' : 'This device only'}</>}
            </span></h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Invoices, estimates, clients and payments for any business.{cloud === 'on' ? ' Saved to your account and this device.' : cloud === 'signedout' ? <> <a className="underline" href="/login?callbackUrl=/studio">Sign in</a> to sync across devices and send secure client links.</> : ' Saved on this device — back up anytime.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BrandSwitcher extras={extras} onSwitch={(b) => switchBrand(b.id)} onAdd={addBrand} />
          <button className={btn} onClick={() => startNew('estimate')}><ScrollText size={16} />New estimate</button>
          <button className={btnPrimary} onClick={() => startNew('invoice')}><FilePlus2 size={16} />New invoice</button>
        </div>
      </div>

      <div role="tablist" className="no-print sticky top-14 z-20 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-4 backdrop-blur-md sm:mx-0 sm:px-0 lg:top-0">
        {tabs.map(({ id, label: l, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium transition ${tab === id ? 'text-[var(--accent)] after:absolute after:inset-x-2 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
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
          {tab === 'clients' && <PortalCard clients={clients} enabled={cloud === 'on'} onCopy={copyPortal} />}
          {tab === 'work' && <ExpensesTimePanel extras={extras} currency={profile.currency} brandId={extras.activeBrandId} draft={draft} clients={clients} onChange={persistExtras} onBill={billWork} />}
          {tab === 'tax' && <TaxReportPanel invoices={invoices} extras={extras} currency={profile.currency} onDownload={(n, csv) => download(n, csv, 'text/csv')} />}
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
                <div className="sm:col-span-2"><span className={label}>Invoice template</span>
                  <div role="radiogroup" aria-label="Invoice template" className="grid grid-cols-3 gap-3">
                    {INVOICE_TEMPLATES.map((t) => {
                      const on = (profile.template ?? 'modern') === t.id;
                      return (
                        <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => persistProfile({ ...profile, template: t.id })}
                          className={`rounded-[var(--radius-md)] border p-3 text-left transition ${on ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}>
                          <span aria-hidden className="mb-2 block h-12 overflow-hidden rounded-md border border-[var(--border)] bg-white">
                            {t.id === 'modern' && <span className="block h-1.5" style={{ background: profile.accentColor }} />}
                            {t.id === 'bold' && <span className="block h-5" style={{ background: profile.accentColor }} />}
                            {t.id === 'classic' && <span className="mx-2 mt-2 block h-px bg-slate-800" />}
                            <span className="mx-2 mt-2 block h-1 w-1/2 rounded bg-slate-200" /><span className="mx-2 mt-1 block h-1 w-1/3 rounded bg-slate-200" />
                          </span>
                          <span className="block text-sm font-semibold text-[var(--text)]">{t.name}</span>
                          <span className="block text-xs text-[var(--text-muted)]">{t.blurb}</span>
                        </button>
                      );
                    })}
                  </div></div>
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
                <div><label className={label}>Late fee % (optional, one-time when overdue)</label>
                  <input type="number" min={0} max={25} step={0.5} className={input} value={profile.lateFeePercent} onChange={(e) => persistProfile({ ...profile, lateFeePercent: Math.max(0, Number(e.target.value) || 0) })} /></div>
                <div className="sm:col-span-2"><label className={label}>Default notes</label>
                  <textarea rows={2} className={input} value={profile.defaultNotes} onChange={(e) => persistProfile({ ...profile, defaultNotes: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className={label}>Overdue reminders (days after due, comma separated)</label>
                  <input className={input} defaultValue={extras.reminderOffsets.join(', ')} key={extras.reminderOffsets.join(',')}
                    onBlur={(e) => { const o = [...new Set(e.target.value.split(',').map((v) => Math.round(Number(v))).filter((n) => n > 0 && n <= 365))].sort((x, y) => x - y); persistExtras({ ...extras, reminderOffsets: o.length ? o : [1, 7, 14, 30] }); }} />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Daily job prepares reminder drafts. It only emails when STUDIO_REMINDERS_AUTO=true and the client is on the email allowlist.</p></div>
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
                <div className="flex items-center gap-2 font-bold text-[var(--text)]">{docWord} {draft.number} <StatusBadge status={status} />{!saved && <span className="text-xs font-normal text-[var(--text-muted)]">unsaved</span>}
                  {draft.clientResponse && <span className="text-xs font-normal text-[var(--text-muted)]">{draft.clientResponse.action === 'accept' ? 'Accepted' : 'Declined'} by {draft.clientResponse.name} on {formatDate(draft.clientResponse.at.slice(0, 10))}</span>}</div>
                <div className="flex flex-wrap gap-2">
                  <button className={btnSm} onClick={saveDraft}><Save size={13} />Save</button>
                  <button className={btnSm} onClick={() => copyLink()}><Link2 size={13} />Client link</button>
                  <a className={btnSm} href={shareUrl(draft)} target="_blank" rel="noreferrer"><ExternalLink size={13} />Preview</a>
                  <button className={btnSm} onClick={() => printPdf()}><Printer size={13} />PDF</button>
                  <button className={btnSm} onClick={() => markSent(draft)}>Mark sent</button>
                  <button className={btnSm} title="Email the secure link (off unless STUDIO_EMAIL_ENABLED=true)" onClick={() => sendEmail(draft)}><Mail size={13} />Email</button>
                  {draft.kind === 'invoice' && draft.status !== 'draft' && totals.balanceDue > 0 && (
                    <button className={btnSm} onClick={() => setReminder(reminderDraft(draft, today, shareUrl(draft)))}><Bell size={13} />Reminder</button>
                  )}
                  {draft.kind === 'estimate' && draft.estimateStatus !== 'converted' && (
                    <button className={btnSm} onClick={() => convert(draft)}><ArrowRightLeft size={13} />Convert to invoice</button>
                  )}
                </div>
              </div>
              {saved && draft.status !== 'draft' && <TrackingCard inv={draft} offsets={extras.reminderOffsets} today={today} />}

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
                  {draft.kind === 'invoice' && (
                    <label className="flex items-center gap-2 text-sm text-[var(--text)] sm:col-span-2">
                      <input type="checkbox" checked={draft.applyLateFee} disabled={!(profile.lateFeePercent > 0)} onChange={(e) => update({ applyLateFee: e.target.checked })} />
                      Apply late fee{profile.lateFeePercent > 0 ? ` (${profile.lateFeePercent}% of balance if overdue${lateFeeNow > 0 ? ` — currently ${formatMoney(lateFeeNow, draft.business.currency)}` : ''})` : ' — set a late fee % in Business profile first'}
                    </label>
                  )}
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
                        <span className="flex items-center gap-3 font-semibold text-[var(--success)]">{formatMoney(p.amount, draft.business.currency)}
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

        {showPreview && <div className="print-reset overflow-x-auto print:!overflow-visible"><InvoiceDocument invoice={draft} today={today} /></div>}
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

      {toast && <div role="status" className="no-print animate-in fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-lg)] ring-1 ring-white/10 lg:bottom-8">{toast}</div>}
    </div>
  );
}
