import { useState } from 'react';
import { useApp } from '../store';
import { Area, Btn, Card, Empty, Field, Screen } from '../ui';
import { deleteReceipt, upsertReceipt } from '../lib/db';
import { formatDate, formatMoney, num, todayISO } from '../lib/util';
import { fileToDataUrl, takeReceiptPhoto } from '../lib/native';
import { isNative } from '../lib/platform';
import { receiptsCsv } from '../lib/exporters';
import { shareFile } from '../lib/native';

export const RECEIPT_CATEGORIES = ['Materials', 'Fuel', 'Tools', 'Meals', 'Office', 'Subcontractor', 'Other'];

export function Receipts() {
  const { db, go, toast } = useApp();
  const total = db.receipts.reduce((s, r) => s + r.amount, 0);
  const exportCsv = async () => {
    await shareFile(`InvoiceJot-receipts-${todayISO()}.csv`, { text: receiptsCsv(db) }, 'text/csv', 'Export receipts');
    toast('Receipts exported');
  };
  return (
    <Screen title="Receipts" action={<button className="link-btn" onClick={() => go({ name: 'receipt', id: null })}>+ New</button>}>
      <p className="muted">Snap job expenses so nothing is missing at tax time. {db.receipts.length ? `Total: ${formatMoney(total, db.business.currency)}` : ''}</p>
      {db.receipts.length === 0 ? (
        <Empty title="No receipts yet" body="Photograph a receipt, add the amount, done. Stored only on this iPhone." action={<Btn onClick={() => go({ name: 'receipt', id: null })}>Add receipt</Btn>} />
      ) : (
        <>
          <ul className="list">
            {[...db.receipts]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <li key={r.id}>
                  <Card onClick={() => go({ name: 'receipt', id: r.id })} label={`${r.vendor || 'Receipt'} ${r.amount}`}>
                    <div className="row">
                      {r.photo ? <img className="thumb" src={r.photo} alt="" /> : <span className="thumb thumb-empty" aria-hidden="true" />}
                      <div className="grow">
                        <div className="strong">{r.vendor || 'Receipt'}</div>
                        <div className="muted small">
                          {formatDate(r.date)}
                          {r.category ? ` · ${r.category}` : ''}
                        </div>
                      </div>
                      <div className="strong">{formatMoney(r.amount, db.business.currency)}</div>
                    </div>
                  </Card>
                </li>
              ))}
          </ul>
          <Btn kind="secondary" onClick={() => void exportCsv()}>
            Export receipts (CSV)
          </Btn>
        </>
      )}
    </Screen>
  );
}

export function ReceiptEdit({ id }: { id: string | null }) {
  const { db, update, back, toast } = useApp();
  const ex = id ? db.receipts.find((r) => r.id === id) : undefined;
  const [f, setF] = useState({ vendor: ex?.vendor ?? '', amount: ex ? String(ex.amount) : '', date: ex?.date ?? todayISO(), category: ex?.category ?? 'Materials', note: ex?.note ?? '', photo: ex?.photo ?? '' });

  const snap = async (source: 'camera' | 'library') => {
    const p = await takeReceiptPhoto(source);
    if (p) setF((x) => ({ ...x, photo: p }));
  };
  const save = () => {
    update((d) => upsertReceipt(d, { id: ex?.id, vendor: f.vendor, amount: num(f.amount), date: f.date, category: f.category, note: f.note, photo: f.photo }));
    toast('Receipt saved');
    back();
  };
  return (
    <Screen title={ex ? 'Receipt' : 'New receipt'} action={<button className="link-btn strong" onClick={save}>Save</button>}>
      {f.photo ? <img className="receipt-photo" src={f.photo} alt="Receipt photo" /> : null}
      {isNative() ? (
        <div className="two">
          <Btn kind="secondary" onClick={() => void snap('camera')}>
            Take photo
          </Btn>
          <Btn kind="ghost" onClick={() => void snap('library')}>
            Choose photo
          </Btn>
        </div>
      ) : (
        <label className="field">
          <span className="field-label">Photo</span>
          <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const p = await fileToDataUrl(file, 1400, 'image/jpeg'); setF((x) => ({ ...x, photo: p })); } }} />
        </label>
      )}
      <Field label="Vendor" value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} placeholder="Home Depot" />
      <div className="two">
        <Field label="Amount" type="number" inputMode="decimal" step="any" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <Field label="Date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </div>
      <label className="field">
        <span className="field-label">Category</span>
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {RECEIPT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <Area label="Note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <Btn onClick={save}>Save receipt</Btn>
      {ex ? (
        <Btn kind="danger" onClick={() => { if (window.confirm('Delete this receipt?')) { update((d) => deleteReceipt(d, ex.id)); back(); } }}>
          Delete receipt
        </Btn>
      ) : null}
    </Screen>
  );
}
