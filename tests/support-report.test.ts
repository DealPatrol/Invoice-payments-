import { describe, expect, it } from 'vitest';
import { createDoc, emptyDatabase, markSent, saveDoc } from '../mobile/src/lib/db';
import { diagnostics, platformLabel, supportMailto } from '../mobile/src/lib/support';
import { APP_VERSION, SUPPORT_EMAIL } from '../mobile/src/lib/config';

describe('support report', () => {
  it('contains counts and version but none of the invoice content', () => {
    const r = createDoc(emptyDatabase(), 'invoice', '2026-11-01');
    let db = saveDoc(r.db, {
      ...r.doc,
      title: 'SECRET-JOB-TITLE',
      notes: 'SECRET-NOTE',
      clientSnapshot: { name: 'SECRET-CLIENT', email: 'secret@example.com', phone: '', address: '' },
      lines: [{ id: 'l', name: 'SECRET-LINE', description: '', quantity: 1, unitPrice: 999.99, taxable: true }],
    });
    db = markSent(db, r.doc.id);
    db = { ...db, business: { ...db.business, name: 'SECRET-BIZ' } };
    const url = supportMailto(diagnostics(db, false, 'iPhone app · iOS 26.1'));
    const text = decodeURIComponent(url);
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`)).toBe(true);
    expect(text).toContain(`Invoice Jot ${APP_VERSION} · iPhone app · iOS 26.1`);
    expect(text).toContain('Plan: Free · documents 1 · clients 0 · receipts 0 · free sends used 1');
    expect(text).toContain('Last backup: never');
    for (const secret of ['SECRET', '999.99', 'example.com']) expect(text).not.toContain(secret);
  });

  it('reads the iOS version out of the user agent', () => {
    expect(platformLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X)', true)).toBe('iPhone app · iOS 18.2');
    expect(platformLabel('Mozilla/5.0 (X11; Linux x86_64)', false)).toBe('web preview');
  });
});
