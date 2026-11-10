import { describe, expect, it } from 'vitest';
import { matchBookItem, needsPriceCount, normalizeSettings, parsePriceBookCsv, priceDraftFromBook } from '@/lib/price-book';

const settings = normalizeSettings({
  rates: { laborRate: 95, tripFee: 0, markupPct: 0, minimumJob: 0, taxRate: 8 },
  priceBook: [
    { id: 'a', name: 'Condenser fan motor', unit: 'ea', unitPrice: 240, kind: 'materials' },
    { id: 'b', name: 'Run capacitor', unit: 'ea', unitPrice: 45, kind: 'materials' },
  ],
});

describe('price book pricing', () => {
  it('prices matched lines from the book and labor from the rate', () => {
    const out = priceDraftFromBook([
      { kind: 'materials', description: 'Condenser fan motor, 1/4 HP', quantity: 1, unit: 'ea', unitPrice: 999 },
      { kind: 'materials', description: 'Run capacitor 5 µF', quantity: 1, unit: 'ea', unitPrice: 999 },
      { kind: 'labor', description: 'Labor', quantity: 1.5, unit: 'hr', unitPrice: 999 },
    ], settings);
    expect(out.map((l) => [l.unitPrice, l.priceSource])).toEqual([[240, 'book'], [45, 'book'], [95, 'rate']]);
  });

  it('never keeps a guessed price for unmatched lines', () => {
    const out = priceDraftFromBook([{ kind: 'materials', description: 'Fan blade', quantity: 1, unit: 'ea', unitPrice: 80 }], settings);
    expect(out[0].unitPrice).toBe(0);
    expect(out[0].priceSource).toBe('needs_price');
    expect(needsPriceCount(out)).toBe(1);
  });

  it('applies markup to materials, adds trip fee and minimum job', () => {
    const s = normalizeSettings({ rates: { laborRate: 100, tripFee: 75, markupPct: 10, minimumJob: 400, taxRate: 0 }, priceBook: settings.priceBook });
    const out = priceDraftFromBook([{ kind: 'materials', description: 'run capacitor', quantity: 1, unit: 'ea', unitPrice: 0 }], s);
    expect(out[0]).toMatchObject({ description: 'Trip / service call fee', unitPrice: 75 });
    expect(out[1].unitPrice).toBe(49.5);
    const total = out.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    expect(total).toBeCloseTo(400, 2);
  });

  it('does not match on weak overlap', () => {
    expect(matchBookItem('Paint the fence', settings.priceBook)).toBeNull();
  });

  it('parses CSV with a header, quotes and dollar signs', () => {
    const items = parsePriceBookCsv('name,unit,price,kind\n"Breaker, 20A",ea,$18.50,materials\nService call,visit,89,other\n');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: 'Breaker, 20A', unit: 'ea', unitPrice: 18.5, kind: 'materials' });
    expect(items[1]).toMatchObject({ kind: 'other', unitPrice: 89 });
  });
});

describe('labor lines never take a parts price', () => {
  it('prices labor at the labor rate even when words overlap a part', () => {
    const out = priceDraftFromBook(
      [
        { kind: 'labor', description: 'Swap the water heater and test', quantity: 4, unit: 'hr', unitPrice: 0 },
        { kind: 'materials', description: '40-gallon water heater', quantity: 1, unit: 'ea', unitPrice: 0 },
      ],
      { rates: { laborRate: 85, tripFee: 0, markupPct: 20, minimumJob: 0, taxRate: 0 }, priceBook: [
        { id: 'a', name: 'Water heater install kit', unit: 'ea', unitPrice: 40, kind: 'materials' },
        { id: 'b', name: '40 gal water heater', unit: 'ea', unitPrice: 650, kind: 'materials' },
      ] },
    );
    expect(out[0]).toMatchObject({ unitPrice: 85, priceSource: 'rate' });
    expect(out[1]).toMatchObject({ unitPrice: 780, priceSource: 'book' });
  });
});
