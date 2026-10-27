'use client';

import { useState } from 'react';
import { CheckCircle2, CreditCard, Download, XCircle } from 'lucide-react';

export function PublicActions({ token, kind, canPay, canRespond, accent, payLabel, externalPayUrl }: {
  token: string; kind: 'invoice' | 'estimate'; canPay: boolean; canRespond: boolean; accent: string; payLabel: string; externalPayUrl?: string;
}) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [done, setDone] = useState('');

  const pay = async () => {
    setBusy(true);
    const res = await fetch('/api/studio/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url; else { setMsg(data.error || 'Online payment unavailable'); setBusy(false); }
  };
  const respond = async (action: 'accept' | 'decline') => {
    if (!name.trim()) return setMsg('Please type your name first.');
    setBusy(true);
    const res = await fetch(`/api/studio/public/${token}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setDone(action === 'accept' ? 'Thanks — estimate accepted.' : 'Estimate declined. Thanks for letting us know.');
    else setMsg(data.error || 'Something went wrong');
  };

  const btnStyle = 'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold disabled:opacity-60';
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <button className={`${btnStyle} border border-gray-300 text-gray-800`} onClick={() => window.print()}><Download size={16} />Download PDF</button>
        {kind === 'invoice' && canPay && (externalPayUrl
          ? <a href={externalPayUrl} target="_blank" rel="noreferrer" className={`${btnStyle} text-white`} style={{ background: accent }}><CreditCard size={16} />{payLabel}</a>
          : <button disabled={busy} onClick={pay} className={`${btnStyle} text-white`} style={{ background: accent }}><CreditCard size={16} />{payLabel}</button>)}
      </div>
      {kind === 'estimate' && canRespond && !done && (
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Your name" placeholder="Type your name to sign" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          <button disabled={busy} onClick={() => respond('accept')} className={`${btnStyle} bg-green-600 text-white`}><CheckCircle2 size={16} />Accept</button>
          <button disabled={busy} onClick={() => respond('decline')} className={`${btnStyle} border border-gray-300 text-gray-800`}><XCircle size={16} />Decline</button>
        </div>
      )}
      {done && <div className="text-sm font-semibold text-green-700">{done}</div>}
      {msg && <div className="text-sm text-red-600">{msg}</div>}
    </div>
  );
}
