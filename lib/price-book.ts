/**
 * Invoice Laboratory price book + "five numbers" shop rates.
 * Every dollar on a drafted estimate comes from here, never from a model guess:
 * matched lines take the book price, labor takes the labor rate, and anything
 * unmatched is left at 0 so the editor flags it as "needs your price".
 */
import type { FieldLineInput, LineKind } from './field-types';
import { roundMoney } from './estimate-domain';

export interface PriceBookItem {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  kind: LineKind;
}

export interface ShopRates {
  laborRate: number; // per hour
  tripFee: number; // flat per job, 0 = none
  markupPct: number; // added to materials prices from the book
  minimumJob: number; // floor for the subtotal, 0 = none
  taxRate: number; // percent, e.g. 8 for 8%
}

export interface ShopSettings {
  rates: ShopRates;
  priceBook: PriceBookItem[];
}

export const DEFAULT_RATES: ShopRates = { laborRate: 0, tripFee: 0, markupPct: 0, minimumJob: 0, taxRate: 0 };

const num = (v: unknown, min = 0, max = 1_000_000) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};

const KINDS: LineKind[] = ['labor', 'materials', 'other'];

export function normalizeRates(input: Partial<ShopRates> | null | undefined): ShopRates {
  const r = input ?? {};
  return {
    laborRate: roundMoney(num(r.laborRate)),
    tripFee: roundMoney(num(r.tripFee)),
    markupPct: num(r.markupPct, 0, 500),
    minimumJob: roundMoney(num(r.minimumJob)),
    taxRate: num(r.taxRate, 0, 30),
  };
}

export function normalizeBook(items: unknown): PriceBookItem[] {
  if (!Array.isArray(items)) return [];
  const out: PriceBookItem[] = [];
  for (const raw of items.slice(0, 2000)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = String(r.name ?? '').trim().slice(0, 160);
    if (!name) continue;
    const kind = KINDS.includes(r.kind as LineKind) ? (r.kind as LineKind) : 'materials';
    out.push({
      id: String(r.id || `pb_${out.length}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`).slice(0, 64),
      name,
      unit: String(r.unit ?? 'ea').trim().slice(0, 16) || 'ea',
      unitPrice: roundMoney(num(r.unitPrice)),
      kind,
    });
  }
  return out;
}

export function normalizeSettings(input: Partial<{ rates: Partial<ShopRates>; priceBook: unknown }> | null | undefined): ShopSettings {
  return { rates: normalizeRates(input?.rates), priceBook: normalizeBook(input?.priceBook) };
}

/** Parse "name,unit,price[,kind]" CSV (header optional, quotes supported). */
export function parsePriceBookCsv(csv: string): PriceBookItem[] {
  const rows: string[][] = [];
  for (const line of csv.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  if (rows.length && /^(name|item|description)$/i.test(rows[0][0] ?? '')) rows.shift();
  return normalizeBook(rows.map((c, i) => ({
    id: `csv_${i}`,
    name: c[0],
    unit: c[1] || 'ea',
    unitPrice: Number(String(c[2] ?? '').replace(/[$,\s]/g, '')) || 0,
    kind: (c[3] || 'materials').toLowerCase(),
  })));
}

const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'new', 'replace', 'install', 'repair', 'if', 'per', 'x']);

export function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9./]+/g, ' ').split(' ').map((t) => t.replace(/s$/, '')).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Best price-book match for a line description, or null when nothing is close enough. */
export function matchBookItem(description: string, book: PriceBookItem[]): PriceBookItem | null {
  const want = new Set(tokens(description));
  if (!want.size) return null;
  let best: PriceBookItem | null = null;
  let bestScore = 0;
  for (const item of book) {
    const have = tokens(item.name);
    if (!have.length) continue;
    const hits = have.filter((t) => want.has(t)).length;
    if (!hits) continue;
    // Share of the book item's words found in the line, lightly rewarding overlap size.
    const score = hits / have.length + hits * 0.01;
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return bestScore >= 0.6 ? best : null;
}

export type PriceSource = 'book' | 'rate' | 'needs_price' | 'fee';

export interface PricedDraftLine extends FieldLineInput {
  priceSource: PriceSource;
}

function isLaborLine(line: FieldLineInput) {
  return line.kind === 'labor' || /^(hr|hrs|hour|hours)$/i.test(line.unit.trim());
}

/**
 * Re-price drafted lines from the contractor's own book and rates.
 * Any incoming unitPrice is discarded: matched lines use the book, labor uses the
 * labor rate, everything else becomes 0 ("needs your price").
 */
export function priceDraftFromBook(lines: FieldLineInput[], settings: ShopSettings): PricedDraftLine[] {
  const { rates, priceBook } = settings;
  const markup = 1 + rates.markupPct / 100;
  const out: PricedDraftLine[] = lines.map((line) => {
    // Labor lines only match labor book items, and parts only match parts/other,
    // so "swap the water heater" never picks up the water heater's price.
    const labor = isLaborLine(line);
    const candidates = priceBook.filter((item) => (item.kind === 'labor') === labor);
    const match = matchBookItem(line.description, candidates);
    if (match) {
      const base = match.kind === 'materials' ? match.unitPrice * markup : match.unitPrice;
      return { ...line, unit: line.unit || match.unit, unitPrice: roundMoney(base), priceSource: 'book' };
    }
    if (labor && rates.laborRate > 0) {
      return { ...line, unitPrice: rates.laborRate, priceSource: 'rate' };
    }
    return { ...line, unitPrice: 0, priceSource: 'needs_price' };
  });
  if (rates.tripFee > 0) {
    out.unshift({ kind: 'other', description: 'Trip / service call fee', quantity: 1, unit: 'visit', unitPrice: rates.tripFee, priceSource: 'fee' });
  }
  const subtotal = out.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const allPriced = out.every((l) => l.priceSource !== 'needs_price');
  if (rates.minimumJob > 0 && allPriced && subtotal < rates.minimumJob) {
    out.push({ kind: 'other', description: 'Minimum job charge adjustment', quantity: 1, unit: 'ea', unitPrice: roundMoney(rates.minimumJob - subtotal), priceSource: 'fee' });
  }
  return out;
}

export function needsPriceCount(lines: Array<Pick<FieldLineInput, 'unitPrice'>>): number {
  return lines.filter((l) => !(l.unitPrice > 0)).length;
}

/** Starter templates: names and units only. Prices are blank on purpose so the contractor sets them. */
export const STARTER_BOOKS: Record<string, { label: string; items: Array<Pick<PriceBookItem, 'name' | 'unit' | 'kind'>> }> = {
  hvac: { label: 'HVAC', items: [
    { name: 'Diagnostic / service call', unit: 'visit', kind: 'other' },
    { name: 'Condenser fan motor', unit: 'ea', kind: 'materials' },
    { name: 'Run capacitor', unit: 'ea', kind: 'materials' },
    { name: 'Contactor', unit: 'ea', kind: 'materials' },
    { name: 'Refrigerant R-410A', unit: 'lb', kind: 'materials' },
    { name: 'Air filter', unit: 'ea', kind: 'materials' },
    { name: 'Thermostat', unit: 'ea', kind: 'materials' },
    { name: 'Condensate drain line clear', unit: 'ea', kind: 'other' },
  ] },
  plumbing: { label: 'Plumbing', items: [
    { name: 'Service call', unit: 'visit', kind: 'other' },
    { name: 'Water heater 40 gal', unit: 'ea', kind: 'materials' },
    { name: 'Toilet wax ring and bolts', unit: 'ea', kind: 'materials' },
    { name: 'Faucet cartridge', unit: 'ea', kind: 'materials' },
    { name: 'PEX pipe', unit: 'ft', kind: 'materials' },
    { name: 'Shutoff valve', unit: 'ea', kind: 'materials' },
    { name: 'Drain cleaning', unit: 'ea', kind: 'other' },
  ] },
  electrical: { label: 'Electrical', items: [
    { name: 'Service call', unit: 'visit', kind: 'other' },
    { name: 'Outlet / receptacle', unit: 'ea', kind: 'materials' },
    { name: 'GFCI receptacle', unit: 'ea', kind: 'materials' },
    { name: 'Light switch', unit: 'ea', kind: 'materials' },
    { name: 'Breaker', unit: 'ea', kind: 'materials' },
    { name: 'Ceiling fan', unit: 'ea', kind: 'materials' },
    { name: 'Romex wire 12/2', unit: 'ft', kind: 'materials' },
  ] },
  handyman: { label: 'Handyman', items: [
    { name: 'Drywall patch', unit: 'ea', kind: 'materials' },
    { name: 'Interior paint', unit: 'gal', kind: 'materials' },
    { name: 'Door hardware', unit: 'ea', kind: 'materials' },
    { name: 'Caulk', unit: 'tube', kind: 'materials' },
    { name: 'Haul-away / disposal', unit: 'load', kind: 'other' },
  ] },
  landscaping: { label: 'Landscaping & fencing', items: [
    { name: 'Mulch', unit: 'yd', kind: 'materials' },
    { name: 'Sod', unit: 'sqft', kind: 'materials' },
    { name: 'Fence post', unit: 'ea', kind: 'materials' },
    { name: 'Fence picket', unit: 'ea', kind: 'materials' },
    { name: 'Concrete bag 80 lb', unit: 'bag', kind: 'materials' },
    { name: 'Debris haul-away', unit: 'load', kind: 'other' },
  ] },
};
