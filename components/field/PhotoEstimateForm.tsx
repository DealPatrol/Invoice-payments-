'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, X } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/kit';
import { fieldClass, labelClass } from './ui';

interface ClientOption {
  id: string | number;
  name: string;
  email: string;
  country: string;
  currency: string;
}

interface JobOption {
  id: string;
  title: string;
  clientName: string;
}

async function compressImage(file: File): Promise<{ mediaType: 'image/jpeg'; dataBase64: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not read the photo');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
  if (!blob) throw new Error('Could not prepare that photo');
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read that photo'));
    reader.readAsDataURL(blob);
  });
  return { mediaType: 'image/jpeg', dataBase64, preview: URL.createObjectURL(blob) };
}

export function PhotoEstimateForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [clientId, setClientId] = useState(search.get('clientId') || '');
  const [jobId, setJobId] = useState(search.get('jobId') || '');
  const [fresh, setFresh] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');
  const [siteAddress, setSiteAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [taxPercent, setTaxPercent] = useState(0);
  const [images, setImages] = useState<Array<{ mediaType: 'image/jpeg'; dataBase64: string; preview: string }>>([]);
  const imagesRef = useRef(images);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/clients').then((response) => response.json()).then((data) => {
      const list = (data.clients ?? []) as ClientOption[];
      setClients(list);
      setClientId((current) => current || (list[0] ? String(list[0].id) : ''));
    }).catch(() => setError('Clients could not be loaded'));
    fetch('/api/jobs').then((response) => response.json()).then((data) => {
      setJobs((data.jobs ?? []) as JobOption[]);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => () => {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview));
  }, []);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setError('');
    try {
      const next = await Promise.all(Array.from(list).slice(0, 4 - images.length).map((file) => compressImage(file)));
      setImages((current) => [...current, ...next].slice(0, 4));
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Could not read that photo');
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/estimates/from-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          images: images.map(({ mediaType, dataBase64 }) => ({ mediaType, dataBase64 })),
          siteAddress,
          taxRate: taxPercent / 100,
          currency: fresh ? currency : undefined,
          jobId: jobId || undefined,
          ...(fresh ? { client: { name, email, country, currency } } : { clientId }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not draft the estimate');
      router.push(`/estimates/${data.estimate.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not draft the estimate');
      setSaving(false);
    }
  }

  return (
    <Page narrow>
      <PageHeader eyebrow="Field work" title="Photo estimate" subtitle="Add the site photos and what the customer asked for. Invoice Laboratory drafts scope, phases, labor, and materials." />
      <form onSubmit={onSubmit} className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-high)] px-4 py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--on-accent)]"><Camera size={22} /></span>
          <span className="text-sm font-semibold text-[var(--text)]">Add site photos</span>
          <span className="max-w-xs text-xs text-[var(--text-muted)]">On your phone, choose Take Photo or Photo Library. Up to 4.</span>
          <input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => { void onFiles(event.target.files); event.target.value = ''; }} />
        </label>
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((image) => (
              <div key={image.preview} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt="Site photo to estimate" className="aspect-square w-full rounded-[10px] object-cover" />
                <button type="button" aria-label="Remove photo" className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white" onClick={() => {
                  URL.revokeObjectURL(image.preview);
                  setImages((current) => current.filter((item) => item !== image));
                }}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <label className="block"><span className={labelClass}>What the customer wants</span>
          <textarea required={images.length === 0} className={`${fieldClass} min-h-28`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="80 ft cedar privacy fence, walk gate on the left, haul away the old panels" />
        </label>
        <label className="block"><span className={labelClass}>Site address</span><input className={fieldClass} value={siteAddress} onChange={(event) => setSiteAddress(event.target.value)} placeholder="Optional if the job already has one" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={labelClass}>Attach to job</span>
            <select className={fieldClass} value={jobId} onChange={(event) => setJobId(event.target.value)}>
              <option value="">Create a job from this draft</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.clientName}</option>)}
            </select>
          </label>
          <label className="block"><span className={labelClass}>Tax %</span><input type="number" min={0} max={100} step="0.01" className={fieldClass} value={taxPercent} onChange={(event) => setTaxPercent(Number(event.target.value))} /></label>
        </div>
        <div className="flex items-center justify-between">
          <span className={labelClass}>Client</span>
          <button type="button" className="text-xs font-semibold text-[var(--accent)]" onClick={() => setFresh((value) => !value)}>{fresh ? 'Use an existing client' : 'New client'}</button>
        </div>
        {fresh ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className={labelClass}>Name</span><input required className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="block sm:col-span-2"><span className={labelClass}>Email</span><input required type="email" className={fieldClass} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="block"><span className={labelClass}>Country</span><input required className={fieldClass} value={country} onChange={(event) => setCountry(event.target.value)} /></label>
            <label className="block"><span className={labelClass}>Currency</span><input required maxLength={3} className={fieldClass} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
          </div>
        ) : (
          <select required className={fieldClass} value={clientId} onChange={(event) => setClientId(event.target.value)}>
            {clients.map((client) => <option key={client.id} value={String(client.id)}>{client.name}</option>)}
          </select>
        )}
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button type="submit" disabled={saving} className="flex w-full items-center justify-center rounded-[10px] bg-[var(--accent)] px-3.5 py-3 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50">{saving ? 'Drafting estimate…' : 'Draft estimate'}</button>
      </form>
    </Page>
  );
}
