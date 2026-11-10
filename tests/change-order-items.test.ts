import { describe, expect, it } from 'vitest';
import { changeOrderItemCreates } from '@/lib/field-service';

describe('change order rows', () => {
  it('never send a tier column (ChangeOrderItem has none)', () => {
    const rows = changeOrderItemCreates([
      { id: 'a', kind: 'materials', description: 'Valve', quantity: 1, unit: 'ea', unitPrice: 40, total: 40, shoppingUrl: null, tier: 'best' },
    ]);
    expect(rows).toEqual([{ kind: 'materials', description: 'Valve', quantity: 1, unit: 'ea', unitPrice: 40, total: 40, shoppingUrl: null, sortOrder: 0 }]);
    expect(rows[0]).not.toHaveProperty('tier');
  });
});
