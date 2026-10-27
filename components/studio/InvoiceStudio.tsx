'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Copy, Download, FilePlus2, Link2, Plus, Printer, Save, Trash2, Upload, Building2, FileText, Pencil,
} from 'lucide-react';
import { InvoiceDocument } from './InvoiceDocument';
import {
  addDays, calcTotals, decodeInvoice, encodeInvoice, formatInvoiceNumber, formatMoney, formatDate,
  loadInvoices, loadProfile, newInvoice, newLineItem, saveInvoices, saveProfile, lineTotal,
  STUDIO_CURRENCIES, TERMS_OPTIONS, UNIT_SUGGESTIONS, DEFAULT_PROFILE,
  type BusinessProfile, type StudioInvoice, type StudioLineItem, type StudioStatus,
} from '@/lib/studio';

type Tab = 'edit' | 'list' | 'profile';

const input =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface-high)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]';
const card = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5';
const btn =
  'inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent)]';
const btnPrimary =
  'inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90';

export function InvoiceStudio() {
  const params = useSearchParams();
  const shared = params.get('doc');
  const printOnly = params.get('print') === '1';

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('edit');
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [invoices, setInvoices] = useState<StudioInvoice[]>([]);
  const [draft, setDraft] = useState<StudioInvoice | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    // Hydrate from localStorage after mount (not available during SSR).
    /* eslint-disable react-hooks/set-state-in-effect */
    const p = loadProfile();
    setProfile(p);
    setInvoices(loadInvoices());
    const fromLink = shared ? decodeInvoice(shared) : null;
    setDraft(fromLink ?? newInvoice(p));
    if (!localStorage.getItem('invoiceos.studio.profile.v1') && !fromLink) setTab('profile');
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [shared]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }, []);

  const totals = useMemo(() => (draft ? calcTotals(draft) : null), [draft]);

  if (!ready || !draft || !totals) return <div className="p-8 text-[var(--text-muted)]">Loading studio…</div>;

  if (printOnly) {
    return (
      <div className="print-reset min-h-screen bg-white">
        <InvoiceDocument invoice={draft} />
      </div>
    );
  }

  const update = (patch: Partial<StudioInvoice>) => setDraft({ ...draft, ...patch, updatedAt: new Date().toISOString() });
  const updateCustomer = (patch: Partial<StudioInvoice['customer']>) => update({ customer: { ...draft.customer, ...patch } });
  const updateItem = (id: string, patch: Partial<StudioLineItem>) =>
    update({ items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  const persistProfile = (p: BusinessProfile) => {
    setProfile(p);
    saveProfile(p);
  };

  const saveDraft = () => {
    const exists = invoices.some((i) => i.id === draft.id);
    const list = exists ? invoices.map((i) => (i.id === draft.id ? draft : i)) : [draft, ...invoices];
    setInvoices(list);
    saveInvoices(list);
    if (!exists) {
      // bump auto-number only when a brand-new invoice used the next number
      if (draft.number === formatInvoiceNumber(profile.invoicePrefix, profile.nextNumber)) {
        persistProfile({ ...profile, nextNumber: profile.nextNumber + 1 });
      }
    }
    flash(`Saved ${draft.number}`);
  };

  const startNew = () => {
    setDraft(newInvoice(profile));
    setTab('edit');
  };

  const duplicate = (inv: StudioInvoice) => {
    const fresh = newInvoice(profile);
    setDraft({ ...inv, id: fresh.id, number: fresh.number, status: 'draft', issueDate: fresh.issueDate,
      dueDate: addDays(fresh.issueDate, inv.termsDays), amountPaid: 0, business: { ...profile },
      createdAt: fresh.createdAt, updatedAt: fresh.updatedAt });
    setTab('edit');
    flash('Duplicated — remember to save');
  };

  const remove = (id: string) => {
    if (!confirm('Delete this invoice from this device?')) return;
    const list = invoices.filter((i) => i.id !== id);
    setInvoices(list);
    saveInvoices(list);
  };

  const setStatus = (id: string, status: StudioStatus) => {
    const list = invoices.map((i) => (i.id === id ? { ...i, status } : i));
    setInvoices(list);
    saveInvoices(list);
    if (draft.id === id) setDraft({ ...draft, status });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/studio?doc=${encodeInvoice(draft)}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    flash('Shareable link copied');
  };

  const printPdf = () => {
    const prev = document.title;
    document.title = `${draft.business.name} - Invoice ${draft.number}`;
    window.print();
    document.title = prev;
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile, invoices }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `invoice-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importData = (file: File) => {
    file.text().then((txt) => {
      try {
        const data = JSON.parse(txt);
        if (data.profile) persistProfile({ ...DEFAULT_PROFILE, ...data.profile });
        if (Array.isArray(data.invoices)) { setInvoices(data.invoices); saveInvoices(data.invoices); }
        flash('Backup imported');
      } catch { flash('Could not read that file'); }
    });
  };

  const onLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => persistProfile({ ...profile, logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'edit', label: 'Invoice', icon: Pencil },
    { id: 'list', label: `Saved (${invoices.length})`, icon: FileText },
    { id: 'profile', label: 'Business', icon: Building2 },
  ];

  return (
    <div className="print-reset p-4 sm:p-6 lg:p-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Invoice Studio</h1>
          <p className="text-sm text-[var(--text-muted)]">Universal invoices for any business — no account needed. Saved on this device.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={startNew}><FilePlus2 size={16} />New</button>
          <button className={btn} onClick={copyLink}><Link2 size={16} />Link</button>
          <button className={btn} onClick={saveDraft}><Save size={16} />Save</button>
          <button className={btnPrimary} onClick={printPdf}><Printer size={16} />Print / PDF</button>
        </div>
      </div>

      <div className="no-print mb-5 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-fit">
        {tabs.map(({ id, label: l, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold sm:flex-none ${tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'}`}>
            <Icon size={15} />{l}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="no-print space-y-4">
          {tab === 'profile' && (
            <div className={card}>
              <h2 className="mb-1 font-bold text-[var(--text)]">Business profile</h2>
              <p className="mb-4 text-sm text-[var(--text-muted)]">Used on every new invoice. Works for any trade — lawn care, consulting, retail, freelance.</p>
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
                  ['invoicePrefix', 'Invoice prefix'],
                ] as const).map(([key, l]) => (
                  <div key={key}>
                    <label className={label}>{l}</label>
                    <input className={input} value={profile[key]} onChange={(e) => persistProfile({ ...profile, [key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label className={label}>Next invoice #</label>
                  <input type="number" className={input} value={profile.nextNumber}
                    onChange={(e) => persistProfile({ ...profile, nextNumber: Number(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className={label}>Currency</label>
                  <select className={input} value={profile.currency} onChange={(e) => persistProfile({ ...profile, currency: e.target.value })}>
                    {STUDIO_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Default terms</label>
                  <select className={input} value={profile.defaultTermsDays} onChange={(e) => persistProfile({ ...profile, defaultTermsDays: Number(e.target.value) })}>
                    {TERMS_OPTIONS.map((t) => <option key={t.days} value={t.days}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Default tax %</label>
                  <input type="number" step="0.01" className={input} value={profile.defaultTaxRate}
                    onChange={(e) => persistProfile({ ...profile, defaultTaxRate: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className={label}>Brand color</label>
                  <input type="color" className={input + ' h-10 p-1'} value={profile.accentColor}
                    onChange={(e) => persistProfile({ ...profile, accentColor: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Address</label>
                  <textarea rows={2} className={input} value={profile.address} onChange={(e) => persistProfile({ ...profile, address: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Default payment instructions</label>
                  <textarea rows={2} className={input} placeholder="e.g. Cash, check payable to …, Venmo @…, Zelle …" value={profile.paymentInstructions}
                    onChange={(e) => persistProfile({ ...profile, paymentInstructions: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Default notes</label>
                  <textarea rows={2} className={input} value={profile.defaultNotes} onChange={(e) => persistProfile({ ...profile, defaultNotes: e.target.value })} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={btnPrimary} onClick={() => { setDraft({ ...draft, business: { ...profile } }); setTab('edit'); flash('Profile applied to current invoice'); }}>Apply to current invoice</button>
                <button className={btn} onClick={exportData}><Download size={16} />Backup</button>
                <label className={btn + ' cursor-pointer'}><Upload size={16} />Restore
                  <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
                </label>
              </div>
            </div>
          )}

          {tab === 'list' && (
            <div className={card}>
              <h2 className="mb-3 font-bold text-[var(--text)]">Saved invoices</h2>
              {invoices.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nothing saved yet. Build an invoice and press Save.</p>}
              <ul className="divide-y divide-[var(--border)]">
                {invoices.map((inv) => {
                  const t = calcTotals(inv);
                  return (
                    <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <button className="text-left" onClick={() => { setDraft(inv); setTab('edit'); }}>
                        <div className="font-semibold text-[var(--text)]">{inv.number} · {inv.customer.name || 'No customer'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{formatDate(inv.issueDate)} · due {formatDate(inv.dueDate)} · {formatMoney(t.total, inv.business.currency)}</div>
                      </button>
                      <div className="flex items-center gap-2">
                        <select className="rounded-md border border-[var(--border)] bg-[var(--surface-high)] px-2 py-1 text-xs text-[var(--text)]" value={inv.status}
                          onChange={(e) => setStatus(inv.id, e.target.value as StudioStatus)}>
                          <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option>
                        </select>
                        <button title="Duplicate" className="text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => duplicate(inv)}><Copy size={16} /></button>
                        <button title="Delete" className="text-[var(--danger)]" onClick={() => remove(inv.id)}><Trash2 size={16} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {tab === 'edit' && (
            <>
              <div className={card}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={label}>Invoice #</label><input className={input} value={draft.number} onChange={(e) => update({ number: e.target.value })} /></div>
                  <div><label className={label}>Status</label>
                    <select className={input} value={draft.status} onChange={(e) => update({ status: e.target.value as StudioStatus })}>
                      <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option>
                    </select></div>
                  <div><label className={label}>Issue date</label>
                    <input type="date" className={input} value={draft.issueDate}
                      onChange={(e) => update({ issueDate: e.target.value, dueDate: addDays(e.target.value, draft.termsDays) })} /></div>
                  <div><label className={label}>Terms</label>
                    <select className={input} value={draft.termsDays}
                      onChange={(e) => { const d = Number(e.target.value); update({ termsDays: d, dueDate: addDays(draft.issueDate, d) }); }}>
                      {TERMS_OPTIONS.map((t) => <option key={t.days} value={t.days}>{t.label}</option>)}
                    </select></div>
                  <div><label className={label}>Due date</label><input type="date" className={input} value={draft.dueDate} onChange={(e) => update({ dueDate: e.target.value })} /></div>
                  <div><label className={label}>Service date (optional)</label><input type="date" className={input} value={draft.serviceDate} onChange={(e) => update({ serviceDate: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={label}>PO / Job # (optional)</label><input className={input} value={draft.poNumber} onChange={(e) => update({ poNumber: e.target.value })} /></div>
                </div>
              </div>

              <div className={card}>
                <h2 className="mb-3 font-bold text-[var(--text)]">Bill to</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={label}>Customer name</label><input className={input} value={draft.customer.name} onChange={(e) => updateCustomer({ name: e.target.value })} /></div>
                  <div><label className={label}>Company</label><input className={input} value={draft.customer.company} onChange={(e) => updateCustomer({ company: e.target.value })} /></div>
                  <div><label className={label}>Email</label><input type="email" className={input} value={draft.customer.email} onChange={(e) => updateCustomer({ email: e.target.value })} /></div>
                  <div><label className={label}>Phone</label><input className={input} value={draft.customer.phone} onChange={(e) => updateCustomer({ phone: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={label}>Address</label><textarea rows={2} className={input} value={draft.customer.address} onChange={(e) => updateCustomer({ address: e.target.value })} /></div>
                </div>
              </div>

              <div className={card}>
                <h2 className="mb-3 font-bold text-[var(--text)]">Line items</h2>
                <datalist id="units">{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
                <div className="space-y-3">
                  {draft.items.map((item, idx) => (
                    <div key={item.id} className="rounded-lg border border-[var(--border)] p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Item {idx + 1}</span>
                        <span className="font-semibold text-[var(--text)]">{formatMoney(lineTotal(item), draft.business.currency)}</span>
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
                  <div><label className={label}>Tax %</label><input type="number" step="0.01" className={input} value={draft.taxRate} onChange={(e) => update({ taxRate: Number(e.target.value) })} /></div>
                  <div><label className={label}>Shipping / delivery</label><input type="number" step="0.01" className={input} value={draft.shipping} onChange={(e) => update({ shipping: Number(e.target.value) })} /></div>
                  <div><label className={label}>Amount paid / deposit</label><input type="number" step="0.01" className={input} value={draft.amountPaid} onChange={(e) => update({ amountPaid: Number(e.target.value) })} /></div>
                  <div className="sm:col-span-2"><label className={label}>Payment instructions</label><textarea rows={2} className={input} value={draft.paymentInstructions} onChange={(e) => update({ paymentInstructions: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={label}>Notes</label><textarea rows={2} className={input} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} /></div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--surface-high)] px-4 py-3">
                  <span className="text-sm text-[var(--text-muted)]">Balance due</span>
                  <span className="text-xl font-black text-[var(--text)]">{formatMoney(totals.balanceDue, draft.business.currency)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="print-reset overflow-x-auto">
          <InvoiceDocument invoice={draft} />
        </div>
      </div>

      {toast && (
        <div className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
