'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Upload } from 'lucide-react';
import { btnGhost, btnPrimary, EmptyState, Page, PageHeader, Panel, SkeletonRows } from '@/components/ui/kit';
import { DEFAULT_RATES, STARTER_BOOKS, normalizeSettings, parsePriceBookCsv, type PriceBookItem, type ShopRates } from '@/lib/price-book';
import { LINE_KINDS, type LineKind } from '@/lib/field-types';
import { fieldClass, labelClass } from './ui';

const RATE_FIELDS: Array<{ key: keyof ShopRates; label: string; hint: string; step: string }> = [
  { key: 'laborRate', label: 'Labor rate ($/hr)', hint: 'Used for every labor hour', step: '1' },
  { key: 'tripFee', label: 'Trip / service fee ($)', hint: 'Added once per estimate (0 = none)', step: '1' },
  { key: 'markupPct', label: 'Materials markup (%)', hint: 'Added to materials prices from your book', step: '0.5' },
  { key: 'minimumJob', label: 'Minimum job ($)', hint: 'Small jobs are raised to this total', step: '1' },
  { key: 'taxRate', label: 'Sales tax (%)', hint: 'Default tax on new estimates', step: '0.01' },
];

let rowSeq = 0;
const newId = () => `pb_${Date.now().toString(36)}_${(rowSeq++).toString(36)}`;

export function PriceBookPanel() {
  const [rates, setRates] = useState<ShopRates>(DEFAULT_RATES);
  const [book, setBook] = useState<PriceBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [csv, setCsv] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetch('/api/price-book')
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 401) throw new Error('Sign in to keep your price book in your account.');
        if (!response.ok) throw new Error(data.error || 'Price book unavailable');
        const settings = normalizeSettings(data);
        setRates(settings.rates);
        setBook(settings.priceBook);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Price book unavailable'))
      .finally(() => setLoading(false));
  }, []);

  async function save(nextBook = book, nextRates = rates) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/price-book', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rates: nextRates, priceBook: nextBook }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save');
      const settings = normalizeSettings(data);
      setRates(settings.rates);
      setBook(settings.priceBook);
      setNotice('Saved. New photo estimates will use these prices.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  function updateItem(id: string, patch: Partial<PriceBookItem>) {
    setBook((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addStarter(key: string) {
    const starter = STARTER_BOOKS[key];
    if (!starter) return;
    const have = new Set(book.map((item) => item.name.toLowerCase()));
    const added = starter.items.filter((item) => !have.has(item.name.toLowerCase())).map((item) => ({ ...item, id: newId(), unitPrice: 0 }));
    setBook((current) => [...current, ...added]);
    setNotice(`Added ${added.length} ${starter.label} items. Set your prices, then save.`);
  }

  function importCsv() {
    const items = parsePriceBookCsv(csv).map((item) => ({ ...item, id: newId() }));
    if (!items.length) { setError('No rows found. Use: name, unit, price, kind'); return; }
    setBook((current) => [...current, ...items]);
    setCsv('');
    setShowImport(false);
    setNotice(`Imported ${items.length} items. Review them, then save.`);
  }

  const unpriced = book.filter((item) => !(item.unitPrice > 0)).length;

  return (
    <Page>
      <PageHeader
        eyebrow="Your numbers"
        title="Price book"
        subtitle="Photo estimates are priced only from this page. Anything not in your book is flagged as needing your price."
        actions={<button type="button" className={btnPrimary} disabled={saving || loading} onClick={() => save()}>{saving ? 'Saving…' : 'Save'}</button>}
      />
      {error && <p className="mb-4 rounded-[10px] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p>}
      {notice && <p className="mb-4 rounded-[10px] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">{notice}</p>}
      {loading ? <SkeletonRows rows={6} /> : (
        <div className="space-y-6">
          <Panel title="Your five numbers">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {RATE_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className={labelClass}>{f.label}</span>
                  <input type="number" inputMode="decimal" min={0} step={f.step} className={fieldClass} value={rates[f.key]} onChange={(e) => setRates({ ...rates, [f.key]: Number(e.target.value) })} />
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">{f.hint}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel
            title={<span>Items {book.length > 0 && <span className="text-[var(--text-muted)]">· {book.length}{unpriced ? `, ${unpriced} need a price` : ''}</span>}</span>}
            actions={<div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhost} onClick={() => setShowImport((v) => !v)}><Upload size={15} />Import CSV</button>
              <button type="button" className={btnGhost} onClick={() => setBook((c) => [...c, { id: newId(), name: '', unit: 'ea', unitPrice: 0, kind: 'materials' }])}><Plus size={15} />Add item</button>
            </div>}
          >
            {showImport && (
              <div className="mb-4 space-y-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-high)] p-3">
                <p className="text-sm text-[var(--text-muted)]">Paste rows as <code>name, unit, price, kind</code> (kind is labor, materials or other). A header row is fine.</p>
                <textarea className={`${fieldClass} min-h-28 font-mono`} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'Run capacitor 5 uF, ea, 45, materials\nService call, visit, 89, other'} />
                <button type="button" className={btnPrimary} onClick={importCsv}>Add these rows</button>
              </div>
            )}
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Start from a trade list (names only, you set prices):</span>
              {Object.entries(STARTER_BOOKS).map(([key, s]) => (
                <button key={key} type="button" className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold hover:border-[var(--accent)]" onClick={() => addStarter(key)}>{s.label}</button>
              ))}
            </div>
            {book.length === 0 ? (
              <EmptyState icon={BookOpen} title="Your price book is empty" body="Add the parts and services you sell with your prices. Estimates will match lines to these items." />
            ) : (
              <div className="space-y-2">
                <div className="hidden grid-cols-[1fr_90px_120px_120px_40px] gap-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)] sm:grid">
                  <span>Item</span><span>Unit</span><span>Price</span><span>Kind</span><span />
                </div>
                {book.map((item) => (
                  <div key={item.id} className="grid grid-cols-2 gap-2 rounded-[10px] border border-[var(--border)] p-2 sm:grid-cols-[1fr_90px_120px_120px_40px] sm:border-0 sm:p-0">
                    <input aria-label="Item name" className={`${fieldClass} col-span-2 sm:col-span-1`} value={item.name} placeholder="e.g. Run capacitor" onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                    <input aria-label="Unit" className={fieldClass} value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })} />
                    <input aria-label="Price" type="number" inputMode="decimal" min={0} step="0.01" className={`${fieldClass} ${item.unitPrice > 0 ? '' : 'border-[var(--warning)]'}`} value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} />
                    <select aria-label="Kind" className={fieldClass} value={item.kind} onChange={(e) => updateItem(item.id, { kind: e.target.value as LineKind })}>
                      {LINE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <button type="button" aria-label={`Remove ${item.name || 'item'}`} className="grid place-items-center rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)]" onClick={() => setBook((c) => c.filter((x) => x.id !== item.id))}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <div className="flex justify-end"><button type="button" className={btnPrimary} disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : 'Save price book'}</button></div>
        </div>
      )}
    </Page>
  );
}
