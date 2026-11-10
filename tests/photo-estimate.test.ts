import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildDemoPhotoEstimate,
  draftPhotoEstimate,
  parsePhotoEstimatePayload,
} from '@/lib/photo-estimate';

const fenced = `
Here is the estimate:
\`\`\`json
{
  "title": "Side gate",
  "scope": "Hang one walk gate on the existing posts.",
  "assumptions": ["Posts are sound."],
  "phases": [{ "name": "Hang gate", "description": "Fit and latch", "durationDays": 1 }],
  "items": [
    { "kind": "labour", "description": "Hang the gate", "quantity": 2, "unit": "hr", "unitPrice": 70 },
    { "kind": "materials", "description": "Gate kit", "quantity": 1, "unit": "kit", "unitPrice": 240 }
  ]
}
\`\`\`
`;

describe('photo estimate parser', () => {
  it('reads fenced JSON and normalizes line kinds', () => {
    const draft = parsePhotoEstimatePayload(fenced);
    expect(draft.title).toBe('Side gate');
    expect(draft.items.map((item) => item.kind)).toEqual(['labor', 'materials']);
    expect(draft.items[1].shoppingUrl).toContain('Gate%20kit');
    expect(draft.phases[0].durationDays).toBe(1);
  });

  it('rejects prose that is not an estimate', () => {
    expect(() => parsePhotoEstimatePayload('no json here')).toThrow(/JSON object/);
    expect(() => parsePhotoEstimatePayload('{"title":"X","scope":"Y","items":[]}')).toThrow(/did not include any lines/);
  });
});

describe('demo photo estimate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('scales a fence from the longest measurement and includes labor, materials, and phases', () => {
    const draft = buildDemoPhotoEstimate({
      notes: '6ft tall cedar privacy fence, about 80 feet, with a walk gate',
      photoCount: 2,
    });
    const panels = draft.items.find((item) => item.kind === 'materials' && item.unit === 'panel');
    expect(draft.title).toContain('80');
    expect(panels?.quantity).toBe(10);
    expect(draft.items.some((item) => item.kind === 'labor')).toBe(true);
    expect(draft.items.some((item) => item.kind === 'materials')).toBe(true);
    expect(draft.items.some((item) => item.description.toLowerCase().includes('gate'))).toBe(true);
    expect(draft.phases.length).toBeGreaterThan(0);
    expect(draft.assumptions.join(' ')).toMatch(/without a live vision model/i);
  });

  it('does not reuse the fence draft for a plumbing note', () => {
    const draft = buildDemoPhotoEstimate({ notes: 'replace the leaking water heater', photoCount: 1 });
    expect(draft.title.toLowerCase()).toContain('water heater');
    expect(draft.items.some((item) => item.description.toLowerCase().includes('panel'))).toBe(false);
  });

  it('returns the demo draft when no Anthropic key is configured', async () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const result = await draftPhotoEstimate({ notes: 'paint 2 rooms', currency: 'USD', images: [] });
    expect(result.source).toBe('demo');
    expect(result.draft.items.length).toBeGreaterThan(0);
  });

  it('uses the model payload when Anthropic is configured', async () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: fenced }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await draftPhotoEstimate({
      notes: 'gate',
      currency: 'USD',
      images: [{ mediaType: 'image/jpeg', dataBase64: 'abc' }],
    });
    expect(result.source).toBe('anthropic');
    expect(result.draft.title).toBe('Side gate');
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.messages[0].content[0].type).toBe('image');
  });
});
