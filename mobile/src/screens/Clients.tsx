import { useState } from 'react';
import { useApp } from '../store';
import { Area, Btn, Card, Empty, Field, Screen } from '../ui';
import { createDoc, deleteClient, saveDoc, upsertClient } from '../lib/db';
import { docTotals } from '../lib/calc';
import { formatMoney } from '../lib/util';

export function Clients() {
  const { db, go } = useApp();
  const [q, setQ] = useState('');
  const list = db.clients.filter((c) => !q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Screen title="Clients" back={false} action={<button className="link-btn" onClick={() => go({ name: 'client', id: null })}>+ New</button>}>
      <input className="search" type="search" placeholder="Search clients" aria-label="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 ? (
        <Empty title="No clients yet" body="Clients you add on an invoice can be saved here so their details fill in next time." action={<Btn onClick={() => go({ name: 'client', id: null })}>Add client</Btn>} />
      ) : (
        <ul className="list">
          {list.map((c) => {
            const owed = db.docs.filter((d) => d.clientId === c.id && d.kind === 'invoice' && d.status !== 'draft').reduce((s, d) => s + docTotals(d).balance, 0);
            return (
              <li key={c.id}>
                <Card onClick={() => go({ name: 'client', id: c.id })} label={c.name}>
                  <div className="row">
                    <div>
                      <div className="strong">{c.name}</div>
                      <div className="muted small">{c.email || c.phone || 'No contact details'}</div>
                    </div>
                    {owed > 0 ? <div className="strong">{formatMoney(owed, db.business.currency)}</div> : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}

export function ClientEdit({ id }: { id: string | null }) {
  const { db, update, back, go, toast } = useApp();
  const existing = id ? db.clients.find((c) => c.id === id) : undefined;
  const [f, setF] = useState({ name: existing?.name ?? '', email: existing?.email ?? '', phone: existing?.phone ?? '', address: existing?.address ?? '' });
  const docs = existing ? db.docs.filter((d) => d.clientId === existing.id) : [];

  const save = () => {
    if (!f.name.trim()) return toast('Add a name first');
    update((d) => upsertClient(d, { ...f, id: existing?.id }).db);
    toast('Client saved');
    back();
  };
  const invoice = () => {
    if (!f.name.trim()) return toast('Add a name first');
    let docId = '';
    update((d) => {
      const r = upsertClient(d, { ...f, id: existing?.id });
      const c = createDoc(r.db, 'invoice');
      docId = c.doc.id;
      return saveDoc(c.db, { ...c.doc, clientId: r.client.id, clientSnapshot: { name: r.client.name, email: r.client.email, phone: r.client.phone, address: r.client.address } });
    });
    go({ name: 'doc', id: docId });
  };
  const remove = () => {
    if (!existing || !window.confirm(`Delete ${existing.name}? Their invoices are kept.`)) return;
    update((d) => deleteClient(d, existing.id));
    back();
  };

  return (
    <Screen title={existing ? 'Edit client' : 'New client'} action={<button className="link-btn strong" onClick={save}>Save</button>}>
      <Field label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="off" />
      <Field label="Email" type="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <Field label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Area label="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      <Btn onClick={save}>Save client</Btn>
      <Btn kind="secondary" onClick={invoice}>
        New invoice for this client
      </Btn>
      {docs.length ? (
        <>
          <h2 className="section">History</h2>
          <ul className="list">
            {docs.map((d) => (
              <li key={d.id}>
                <Card onClick={() => go({ name: 'doc', id: d.id })} label={d.number}>
                  <div className="row">
                    <span>{d.number}</span>
                    <span>{formatMoney(docTotals(d).total, db.business.currency)}</span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {existing ? (
        <Btn kind="danger" onClick={remove}>
          Delete client
        </Btn>
      ) : null}
    </Screen>
  );
}
