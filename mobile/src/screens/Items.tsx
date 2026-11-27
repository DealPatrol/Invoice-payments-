import { useState } from 'react';
import { useApp } from '../store';
import { Btn, Empty, Field, Screen } from '../ui';
import { deleteItem, upsertItem } from '../lib/db';
import { formatMoney, num } from '../lib/util';

export function Items() {
  const { db, update, toast } = useApp();
  const [f, setF] = useState({ name: '', unitPrice: '', description: '' });
  const add = () => {
    if (!f.name.trim()) return toast('Name the item first');
    update((d) => upsertItem(d, { name: f.name, unitPrice: num(f.unitPrice), description: f.description }));
    setF({ name: '', unitPrice: '', description: '' });
    toast('Item saved');
  };
  return (
    <Screen title="Saved items">
      <p className="muted">Items you use on invoices are saved here automatically and autofill next time.</p>
      <div className="card">
        <Field label="Item name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="two">
          <Field label="Price" type="number" inputMode="decimal" step="any" value={f.unitPrice} onChange={(e) => setF({ ...f, unitPrice: e.target.value })} />
          <Field label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <Btn onClick={add}>Add item</Btn>
      </div>
      {db.items.length === 0 ? (
        <Empty title="No saved items" body="Add your common services and parts to build invoices faster." />
      ) : (
        <ul className="list">
          {db.items.map((it) => (
            <li key={it.id} className="card row">
              <div>
                <div className="strong">{it.name}</div>
                {it.description ? <div className="muted small">{it.description}</div> : null}
              </div>
              <div className="right">
                <div>{formatMoney(it.unitPrice, db.business.currency)}</div>
                <button className="link-btn danger" onClick={() => update((d) => deleteItem(d, it.id))} aria-label={`Delete ${it.name}`}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
