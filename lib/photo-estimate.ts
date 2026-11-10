import { isDemoMode } from './config';
import { materialShoppingUrl, roundMoney } from './estimate-domain';
import type { FieldLineInput, FieldPhaseInput, LineKind } from './field-types';

export interface PhotoDraft {
  title: string;
  scope: string;
  assumptions: string[];
  phases: FieldPhaseInput[];
  items: FieldLineInput[];
}

export interface PhotoImage {
  mediaType: string;
  dataBase64: string;
}

const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGES = 4;
const MAX_BASE64_CHARS = 1_000_000;

type TradeId = 'fence' | 'hardscape' | 'lawn' | 'paint' | 'roof' | 'plumbing' | 'electrical' | 'general';

function largestMeasure(notes: string, unit: RegExp): number | null {
  const flags = unit.flags.includes('g') ? unit.flags : `${unit.flags}g`;
  const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${unit.source})`, flags);
  let best: number | null = null;
  for (const match of notes.matchAll(pattern)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    if (best === null || value > best) best = value;
  }
  return best;
}

export function detectTrade(notes: string): TradeId {
  const text = notes.toLowerCase();
  if (/plumb|leak|water heater|faucet|drain|toilet|pipe/.test(text)) return 'plumbing';
  if (/electri|outlet|panel|rewire|fixture|switch/.test(text)) return 'electrical';
  if (/roof|shingle|gutter/.test(text)) return 'roof';
  if (/paint|primer|repaint/.test(text)) return 'paint';
  if (/paver|patio|hardscape|walkway|retaining/.test(text)) return 'hardscape';
  if (/fence|gate|privacy/.test(text)) return 'fence';
  if (/lawn|mow|mulch|landscape|hedge|bed/.test(text)) return 'lawn';
  return 'general';
}

function line(kind: LineKind, description: string, quantity: number, unit: string, unitPrice: number): FieldLineInput {
  const shoppingUrl = kind === 'materials' ? materialShoppingUrl(description) : null;
  return {
    kind,
    description,
    quantity: roundMoney(quantity),
    unit,
    unitPrice: roundMoney(unitPrice),
    shoppingUrl,
  };
}

function photoAssumption(photoCount: number): string {
  if (photoCount > 0) {
    return `Read from ${photoCount} site photo${photoCount === 1 ? '' : 's'} plus the written notes. Confirm measurements on site.`;
  }
  return 'No site photo was attached. This draft follows the written notes only.';
}

function demoAssumption(): string {
  return 'Lines drafted from your notes by the built-in drafter. Prices come from your price book and labor rate; review every line before sending.';
}

function fenceDraft(notes: string, photoCount: number): PhotoDraft {
  const feet = largestMeasure(notes, /foot|feet|ft|linear/) ?? 80;
  const panels = Math.max(1, Math.ceil(feet / 8));
  const posts = panels + 1;
  const wantsGate = /gate/i.test(notes);
  const items = [
    line('labor', 'Set posts, level, and brace', Math.max(4, Math.ceil(feet / 10)), 'hr', 68),
    line('labor', 'Hang panels, rails, and hardware', Math.max(3, Math.ceil(feet / 12)), 'hr', 62),
    line('materials', 'Privacy fence panels, 8 ft', panels, 'panel', 92),
    line('materials', '4x4 ground-contact posts', posts, 'post', 28),
    line('materials', 'Concrete mix, 50 lb', posts, 'bag', 7.5),
    line('other', 'Haul-off of old material and spoil', 1, 'trip', 165),
  ];
  if (wantsGate) {
    items.push(line('labor', 'Hang a walk gate and adjust the latch', 2, 'hr', 68));
    items.push(line('materials', 'Walk gate kit with hardware', 1, 'kit', 248));
  }
  return {
    title: `${Math.round(feet)} ft privacy fence`,
    scope: `Replace or install about ${Math.round(feet)} feet of privacy fence, including posts, panels, and hardware.${wantsGate ? ' Includes one walk gate.' : ''} ${photoCount ? 'The line follows the notes and the site photos.' : 'The line follows the written notes.'}`,
    assumptions: [
      photoAssumption(photoCount),
      demoAssumption(),
      'Post spacing is 8 feet. Digging assumes ordinary soil, not rock or buried utilities.',
      'Homeowner confirms the property line before posts are set.',
    ],
    phases: [
      { name: 'Layout and posts', description: 'Mark the line, call utilities, set and brace posts.', durationDays: 1 },
      { name: 'Panels and cleanup', description: 'Hang panels, hardware, and haul away spoil.', durationDays: 1 },
    ],
    items,
  };
}

function hardscapeDraft(notes: string, photoCount: number): PhotoDraft {
  const area = largestMeasure(notes, /sq\s?ft|square feet|sf/) ?? 180;
  return {
    title: `${Math.round(area)} sq ft paver patio`,
    scope: `Excavate, base, and lay about ${Math.round(area)} square feet of pavers. Edge restraint and polymeric sand are included. Final elevation follows the existing door threshold${photoCount ? ' and the slope in the photos' : ''}.`,
    assumptions: [
      photoAssumption(photoCount),
      demoAssumption(),
      'Base depth is 4–6 inches of compacted aggregate. Unsuitable soils are extra.',
      'Pavers are a standard concrete product, not natural stone, unless the notes say otherwise.',
    ],
    phases: [
      { name: 'Excavate and base', description: 'Remove sod, set grade, and compact the aggregate base.', durationDays: 1 },
      { name: 'Lay and finish', description: 'Set pavers, cut edges, sweep sand, and clean the site.', durationDays: 1 },
    ],
    items: [
      line('labor', 'Excavate and compact base', Math.max(6, Math.ceil(area / 30)), 'hr', 72),
      line('labor', 'Lay pavers and finish edges', Math.max(8, Math.ceil(area / 18)), 'hr', 75),
      line('materials', 'Concrete pavers', area, 'sq ft', 5.4),
      line('materials', 'Compactable base aggregate', Math.max(1, Math.ceil(area / 80)), 'yard', 62),
      line('other', 'Edge restraint, sand, and delivery', 1, 'lot', 185),
    ],
  };
}

function lawnDraft(notes: string, photoCount: number): PhotoDraft {
  const beds = largestMeasure(notes, /bed|beds/) ?? 3;
  return {
    title: 'Lawn cleanup and bed refresh',
    scope: `Clean up the yard, redefine about ${Math.round(beds)} planting beds, and refresh mulch. The visit covers what the notes describe${photoCount ? ' and the conditions in the photos' : ''}, not a full landscape redesign.`,
    assumptions: [
      photoAssumption(photoCount),
      demoAssumption(),
      'Plant material is limited to the lines below. Specimen trees are quoted separately.',
      'Irrigation repairs are not included unless listed.',
    ],
    phases: [
      { name: 'Cleanup', description: 'Mow, edge, and haul green waste.', durationDays: 1 },
      { name: 'Beds', description: 'Cut edges, place mulch, and leave the site raked.', durationDays: 1 },
    ],
    items: [
      line('labor', 'Mow, edge, and haul clippings', 4, 'hr', 55),
      line('labor', 'Redefine beds and spread mulch', Math.max(3, beds * 1.5), 'hr', 55),
      line('materials', 'Shredded hardwood mulch', Math.max(2, beds), 'yard', 48),
      line('other', 'Green-waste disposal', 1, 'load', 75),
    ],
  };
}

function paintDraft(notes: string, photoCount: number): PhotoDraft {
  const rooms = largestMeasure(notes, /room|rooms/) ?? 2;
  const gallons = Math.max(2, Math.ceil(rooms * 2));
  return {
    title: rooms === 1 ? 'Interior room repaint' : `Repaint ${Math.round(rooms)} rooms`,
    scope: `Prep and repaint about ${Math.round(rooms)} interior room${rooms === 1 ? '' : 's'}: patch, sand, prime bare spots, and apply two finish coats. Color is confirmed by the customer before paint is opened.`,
    assumptions: [
      photoAssumption(photoCount),
      demoAssumption(),
      'Ceilings are included only when the notes mention them.',
      'Lead-safe work on pre-1978 paint is extra if testing requires it.',
    ],
    phases: [
      { name: 'Prep', description: 'Protect floors, patch, sand, and prime.', durationDays: 1 },
      { name: 'Finish coats', description: 'Two coats, then remove protection and touch up.', durationDays: 1 },
    ],
    items: [
      line('labor', 'Prep, patch, and mask', Math.max(4, rooms * 3), 'hr', 58),
      line('labor', 'Two finish coats', Math.max(5, rooms * 4), 'hr', 58),
      line('materials', 'Interior paint', gallons, 'gal', 54),
      line('materials', 'Primer and patching compound', 1, 'lot', 42),
      line('other', 'Floor protection and sundries', 1, 'lot', 36),
    ],
  };
}

function roofDraft(notes: string, photoCount: number): PhotoDraft {
  const squares = largestMeasure(notes, /square|squares/) ?? 18;
  return {
    title: `${Math.round(squares)}-square roof replacement`,
    scope: `Tear off one layer and install architectural shingles on about ${Math.round(squares)} squares, including underlayment, flashing at the penetrations that are visible, and ridge cap.`,
    assumptions: [
      photoAssumption(photoCount),
      demoAssumption(),
      'One existing layer. Extra layers or deck replacement are a change order.',
      'Permit fee is an allowance and is adjusted to the city invoice.',
    ],
    phases: [
      { name: 'Tear-off', description: 'Strip the roof, inspect the deck, and dry it in.', durationDays: 1 },
      { name: 'Install', description: 'Shingles, flashing, ridge, and magnet the yard.', durationDays: 1 },
    ],
    items: [
      line('labor', 'Tear-off and dry-in', Math.max(8, squares * 0.7), 'hr', 75),
      line('labor', 'Shingle, flash, and clean up', Math.max(10, squares), 'hr', 75),
      line('materials', 'Architectural shingles', squares, 'square', 115),
      line('materials', 'Underlayment, vents, and ridge', squares, 'square', 38),
      line('other', 'Dumpster and permit allowance', 1, 'lot', 640),
    ],
  };
}

function plumbingDraft(notes: string, photoCount: number): PhotoDraft {
  return {
    title: /water heater/i.test(notes) ? 'Water heater replacement' : 'Plumbing repair',
    scope: /water heater/i.test(notes)
      ? 'Disconnect the existing water heater, set a like-for-like replacement, and reconnect water, power or gas, and the relief drain. The old unit is hauled away.'
      : 'Diagnose the issue described in the notes, repair the accessible fixture or line, and test for leaks before leaving.',
    assumptions: [
      photoAssumption(photoCount),
      demoAssumption(),
      'Access is clear. Opening finished walls is a change order.',
      'Permit allowance covers a standard residential permit where the city requires one.',
    ],
    phases: [
      { name: 'Diagnose and isolate', description: 'Shut off, confirm the failed part, and protect the floor.', durationDays: 1 },
      { name: 'Repair and test', description: 'Replace the part, restore service, and check for leaks.', durationDays: 1 },
    ],
    items: /water heater/i.test(notes)
      ? [
          line('labor', 'Swap the water heater and test', 4, 'hr', 95),
          line('materials', '40-gallon water heater', 1, 'ea', 620),
          line('materials', 'Fittings, pan, and supply lines', 1, 'lot', 85),
          line('other', 'Haul-off and permit allowance', 1, 'lot', 140),
        ]
      : [
          line('labor', 'Diagnose and repair the leak or fixture', 3, 'hr', 95),
          line('materials', 'Fixture or repair parts allowance', 1, 'lot', 120),
          line('other', 'Trip and disposal', 1, 'visit', 45),
        ],
  };
}

function electricalDraft(notes: string, photoCount: number): PhotoDraft {
  const openings = largestMeasure(notes, /outlet|outlets|opening|openings|fixture|fixtures/) ?? 4;
  return {
    title: `Electrical work, ${Math.round(openings)} openings`,
    scope: `Update about ${Math.round(openings)} openings described in the notes. Devices are replaced, the circuit is tested, and the panel cover goes back on. New home-runs are not included unless listed.`,
    assumptions: [
      photoAssumption(photoCount),
      demoAssumption(),
      'Existing wiring is reusable. Aluminum or damaged cable is a change order.',
      'Permit allowance is adjusted to the inspection fee.',
    ],
    phases: [
      { name: 'Make safe', description: 'Kill the circuit, verify, and open the boxes.', durationDays: 1 },
      { name: 'Devices and test', description: 'Install devices, restore power, and test.', durationDays: 1 },
    ],
    items: [
      line('labor', 'Device replacement and testing', Math.max(3, openings * 0.75), 'hr', 98),
      line('materials', 'Devices, boxes, and covers', openings, 'ea', 18),
      line('other', 'Permit allowance', 1, 'lot', 125),
    ],
  };
}

function generalDraft(notes: string, photoCount: number): PhotoDraft {
  const summary = notes.trim().slice(0, 180) || 'General site work from the uploaded photos';
  return {
    title: 'Site work estimate',
    scope: `Field draft for: ${summary}. Labor covers a crew day to complete the described work. Materials are an allowance until the supplier confirms stock.`,
    assumptions: [
      photoAssumption(photoCount),
      demoAssumption(),
      'One mobilization. Hidden conditions behind finishes are a change order.',
    ],
    phases: [
      { name: 'Mobilize and prep', description: 'Protect the work area and stage materials.', durationDays: 1 },
      { name: 'Complete and clean', description: 'Finish the scope and leave the site broom-clean.', durationDays: 1 },
    ],
    items: [
      line('labor', 'Lead carpenter', 8, 'hr', 75),
      line('labor', 'Helper', 8, 'hr', 45),
      line('materials', 'Material allowance from the notes', 1, 'lot', 350),
      line('other', 'Mobilization and cleanup', 1, 'trip', 85),
    ],
  };
}

export function buildDemoPhotoEstimate(input: { notes: string; photoCount: number }): PhotoDraft {
  const notes = input.notes.trim();
  const trade = detectTrade(notes);
  switch (trade) {
    case 'fence':
      return fenceDraft(notes, input.photoCount);
    case 'hardscape':
      return hardscapeDraft(notes, input.photoCount);
    case 'lawn':
      return lawnDraft(notes, input.photoCount);
    case 'paint':
      return paintDraft(notes, input.photoCount);
    case 'roof':
      return roofDraft(notes, input.photoCount);
    case 'plumbing':
      return plumbingDraft(notes, input.photoCount);
    case 'electrical':
      return electricalDraft(notes, input.photoCount);
    case 'general':
      return generalDraft(notes, input.photoCount);
    default: {
      const unexpected: never = trade;
      return unexpected;
    }
  }
}

const draftItemSchema = {
  kind: (value: unknown): LineKind => {
    const text = String(value ?? '').toLowerCase();
    if (text === 'labor' || text === 'labour' || text.includes('labor') || text.includes('labour')) return 'labor';
    if (text === 'material' || text === 'materials' || text.includes('material')) return 'materials';
    return 'other';
  },
};

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('The model response did not include an estimate JSON object');
  }
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch {
    throw new Error('The model response was not valid JSON');
  }
}

export function parsePhotoEstimatePayload(raw: string): PhotoDraft {
  const value = extractJsonObject(raw);
  if (!value || typeof value !== 'object') {
    throw new Error('The model response was not an estimate object');
  }
  const record = value as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const scope = typeof record.scope === 'string' ? record.scope.trim() : '';
  if (!title || !scope) throw new Error('The estimate draft is missing a title or scope');

  const assumptions = Array.isArray(record.assumptions)
    ? record.assumptions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];

  const phases: FieldPhaseInput[] = Array.isArray(record.phases)
    ? record.phases.flatMap((phase) => {
        if (!phase || typeof phase !== 'object') return [];
        const row = phase as Record<string, unknown>;
        const name = typeof row.name === 'string' ? row.name.trim() : '';
        if (!name) return [];
        const duration = typeof row.durationDays === 'number' && row.durationDays > 0 ? Math.round(row.durationDays) : null;
        return [{
          name,
          description: typeof row.description === 'string' ? row.description.trim() : '',
          durationDays: duration,
        }];
      })
    : [];

  if (!Array.isArray(record.items) || record.items.length === 0) {
    throw new Error('The estimate draft did not include any lines');
  }

  const items: FieldLineInput[] = record.items.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('A draft line was empty');
    const row = item as Record<string, unknown>;
    const description = typeof row.description === 'string' ? row.description.trim() : '';
    const quantity = Number(row.quantity);
    const unitPrice = Number(row.unitPrice);
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice)) {
      throw new Error('A draft line is missing a description, quantity, or price');
    }
    const kind = draftItemSchema.kind(row.kind);
    const unit = typeof row.unit === 'string' && row.unit.trim() ? row.unit.trim() : 'ea';
    const provided = typeof row.shoppingUrl === 'string' ? row.shoppingUrl.trim() : '';
    return {
      kind,
      description,
      quantity,
      unit,
      unitPrice,
      shoppingUrl: kind === 'materials' ? (provided || materialShoppingUrl(description)) : null,
    };
  });

  return { title, scope, assumptions, phases, items };
}

function promptFor(input: { notes: string; currency: string; clientName?: string; photoCount: number; bookNames?: string[] }): string {
  const book = (input.bookNames ?? []).slice(0, 200);
  return `You are the estimating desk inside Invoice Laboratory. A tradesperson uploaded ${input.photoCount} job-site photo(s) and described what the customer wants. Draft an editable estimate: scope, phases, and separate labor, materials, and other lines.

Customer: ${input.clientName || 'the customer'}
Currency: ${input.currency}
Field notes:
${input.notes.trim() || '(no notes — infer a reasonable scope from the photos only)'}

Return ONLY JSON:
{
  "title": "short job title",
  "scope": "2-4 plain sentences",
  "assumptions": ["conditions that change the price"],
  "phases": [{ "name": "", "description": "", "durationDays": 1 }],
  "items": [{ "kind": "labor", "description": "", "quantity": 1, "unit": "hr", "unitPrice": 0 }]
}

kind is "labor", "materials", or "other".
Always set unitPrice to 0. Prices come only from the contractor's own price book and rates, never from you.
${book.length ? `When an item fits, reuse the exact name from the contractor's price book: ${book.join('; ')}` : ''}
Quantities must follow the notes and the photos. State assumptions instead of inventing hidden work.
No markdown and no code fences.`;
}

export function normalizePhotoImages(images: PhotoImage[]): PhotoImage[] {
  if (images.length > MAX_IMAGES) {
    throw new Error(`Attach up to ${MAX_IMAGES} photos`);
  }
  return images.map((image) => {
    const mediaType = image.mediaType.toLowerCase();
    if (!ALLOWED_MEDIA.has(mediaType)) {
      throw new Error('Photos must be JPEG, PNG, WebP, or GIF');
    }
    const dataBase64 = image.dataBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
    if (!dataBase64 || dataBase64.length > MAX_BASE64_CHARS) {
      throw new Error('A photo is too large. Retake it a little farther back and try again.');
    }
    return { mediaType, dataBase64 };
  });
}

async function callAnthropic(input: {
  notes: string;
  currency: string;
  clientName?: string;
  images: PhotoImage[];
  apiKey: string;
  bookNames?: string[];
}): Promise<PhotoDraft> {
  const content: Array<Record<string, unknown>> = input.images.map((image) => ({
    type: 'image',
    source: { type: 'base64', media_type: image.mediaType, data: image.dataBase64 },
  }));
  content.push({
    type: 'text',
    text: promptFor({
      notes: input.notes,
      currency: input.currency,
      clientName: input.clientName,
      photoCount: input.images.length,
      bookNames: input.bookNames,
    }),
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content }],
    }),
  });

  if (response.status === 401) throw new Error('Anthropic rejected the API key.');
  if (!response.ok) throw new Error(`Estimate model failed (HTTP ${response.status}).`);

  const payload = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  const text = (payload.content ?? []).filter((block) => block.type === 'text').map((block) => block.text ?? '').join('\n');
  return parsePhotoEstimatePayload(text);
}

export async function draftPhotoEstimate(input: {
  notes: string;
  currency: string;
  clientName?: string;
  images: PhotoImage[];
  bookNames?: string[];
}): Promise<{ draft: PhotoDraft; source: 'anthropic' | 'demo' }> {
  const images = normalizePhotoImages(input.images);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (isDemoMode() || !apiKey) {
    return {
      draft: buildDemoPhotoEstimate({ notes: input.notes, photoCount: images.length }),
      source: 'demo',
    };
  }
  const draft = await callAnthropic({ ...input, images, apiKey });
  return { draft, source: 'anthropic' };
}

export function schematicPreviewDataUrl(title: string, scope: string): string {
  const escape = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const heading = escape(title.slice(0, 64));
  const detail = escape(scope.replace(/\s+/g, ' ').slice(0, 160));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#e7efe4"/>
  <rect x="0" y="360" width="960" height="180" fill="#d5c4a1"/>
  <rect x="70" y="150" width="520" height="230" fill="#f7f4ee" stroke="#243044" stroke-width="6"/>
  <polygon points="60,160 330,60 600,160" fill="#4f46e5"/>
  <rect x="120" y="210" width="90" height="70" fill="#c9d7ee" stroke="#243044" stroke-width="4"/>
  <rect x="250" y="210" width="90" height="70" fill="#c9d7ee" stroke="#243044" stroke-width="4"/>
  <rect x="430" y="250" width="70" height="130" fill="#243044"/>
  <rect x="640" y="250" width="250" height="120" fill="#6b8f71" stroke="#243044" stroke-width="4"/>
  <circle cx="760" cy="200" r="28" fill="#f6c453"/>
  <text x="48" y="470" fill="#243044" font-family="ui-sans-serif,system-ui" font-size="28" font-weight="700">${heading}</text>
  <text x="48" y="506" fill="#415066" font-family="ui-sans-serif,system-ui" font-size="16">${detail}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function replicateOutputUrl(output: unknown): string | null {
  if (typeof output === 'string' && output.startsWith('http')) return output;
  if (Array.isArray(output)) {
    const first = output.find((item) => typeof item === 'string' && item.startsWith('http'));
    return typeof first === 'string' ? first : null;
  }
  return null;
}

async function replicatePreview(prompt: string, token: string): Promise<string> {
  const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'wait=20',
    },
    body: JSON.stringify({
      input: {
        prompt,
        go_fast: true,
        num_outputs: 1,
        output_format: 'webp',
      },
    }),
  });
  if (!response.ok) throw new Error(`Preview model failed (HTTP ${response.status}).`);
  const payload = await response.json() as { output?: unknown; status?: string; urls?: { get?: string } };
  const immediate = replicateOutputUrl(payload.output);
  if (immediate) return immediate;
  if (!payload.urls?.get) throw new Error('Preview model did not return an image');

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const poll = await fetch(payload.urls.get, { headers: { authorization: `Bearer ${token}` } });
    if (!poll.ok) break;
    const next = await poll.json() as { output?: unknown; status?: string };
    const url = replicateOutputUrl(next.output);
    if (url) return url;
    if (next.status === 'failed' || next.status === 'canceled') break;
  }
  throw new Error('Preview model timed out');
}

export async function buildAfterPreview(input: { title: string; scope: string }): Promise<{ previewDataUrl: string; source: 'replicate' | 'schematic' }> {
  const schematic = () => ({
    previewDataUrl: schematicPreviewDataUrl(input.title, input.scope),
    source: 'schematic' as const,
  });
  const token = process.env.REPLICATE_API_TOKEN;
  if (isDemoMode() || !token) return schematic();
  try {
    const previewDataUrl = await replicatePreview(
      `Photorealistic daytime photo of a finished residential job, no text, no logo, no people. ${input.title}. ${input.scope}`,
      token,
    );
    return { previewDataUrl, source: 'replicate' };
  } catch {
    return schematic();
  }
}
