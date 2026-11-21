import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import {
  isAppChromePath,
  isCustomerFacingPath,
  isIosSafari,
  shouldShowIosInstallHint,
} from '@/lib/pwa';

const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

const hint = (overrides: Partial<Parameters<typeof shouldShowIosInstallHint>[0]> = {}) =>
  shouldShowIosInstallHint({
    userAgent: IOS_SAFARI,
    standalone: false,
    displayModeStandalone: false,
    dismissed: false,
    pathname: '/',
    search: '',
    ...overrides,
  });

describe('iOS install hint', () => {
  it('shows for iOS Safari visitors who are not in standalone mode', () => {
    expect(hint()).toBe(true);
    expect(isIosSafari(IOS_SAFARI)).toBe(true);
  });

  it('shows for iPadOS Safari, which reports as Macintosh with touch', () => {
    expect(hint({ userAgent: MAC_SAFARI, maxTouchPoints: 5, platform: 'MacIntel' })).toBe(true);
    expect(isIosSafari(MAC_SAFARI, 5, 'MacIntel')).toBe(true);
  });

  it('hides in standalone mode, after dismiss, on desktop, and in iOS Chrome', () => {
    expect(hint({ standalone: true })).toBe(false);
    expect(hint({ displayModeStandalone: true })).toBe(false);
    expect(hint({ dismissed: true })).toBe(false);
    expect(hint({ userAgent: MAC_SAFARI, maxTouchPoints: 0, platform: 'MacIntel' })).toBe(false);
    expect(hint({ userAgent: IOS_CHROME })).toBe(false);
  });

  it('hides on customer-facing invoice, pay, portal, and print views', () => {
    expect(isCustomerFacingPath('/pay/tok_abc')).toBe(true);
    expect(isCustomerFacingPath('/i/inv_1')).toBe(true);
    expect(isCustomerFacingPath('/portal/abc')).toBe(true);
    expect(isCustomerFacingPath('/estimate/abc')).toBe(true);
    expect(isCustomerFacingPath('/studio', '?print=1')).toBe(true);
    expect(isCustomerFacingPath('/studio', 'view=1')).toBe(true);
    expect(isCustomerFacingPath('/estimates')).toBe(false);
    expect(isCustomerFacingPath('/dashboard')).toBe(false);
    expect(hint({ pathname: '/pay/tok_abc' })).toBe(false);
    expect(hint({ pathname: '/dashboard' })).toBe(true);
  });

  it('lifts the hint above the app tab bar only on chrome routes', () => {
    expect(isAppChromePath('/dashboard')).toBe(true);
    expect(isAppChromePath('/')).toBe(false);
    expect(isAppChromePath('/login')).toBe(false);
    expect(isAppChromePath('/studio', '?print=1')).toBe(false);
  });
});

describe('web app manifest', () => {
  const manifest = JSON.parse(readFileSync(resolve('public/manifest.webmanifest'), 'utf8'));

  it('is installable with brand colors and 192/512 maskable icons', () => {
    expect(manifest.name).toBe('Invoice Laboratory');
    expect(manifest.short_name).toBe('Invoice Lab');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#f3efe6');
    expect(manifest.theme_color).toBe('#8c4a22');
    const icons = manifest.icons as Array<{ src: string; sizes: string; type: string; purpose: string }>;
    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }),
        expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }),
        expect.objectContaining({ src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' }),
        expect.objectContaining({ src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }),
      ]),
    );
  });
});

describe('service worker', () => {
  const source = readFileSync(resolve('public/sw.js'), 'utf8');

  it('stays network-only and never caches responses', () => {
    expect(source).toMatch(/addEventListener\(['"]fetch['"]/);
    expect(source).toMatch(/skipWaiting/);
    expect(source).toMatch(/clients\.claim/);
    expect(source).not.toMatch(/caches\.(open|match|add|addAll|put)/);
    expect(source).not.toMatch(/cache\.(put|add|addAll|match)/);
    expect(source).toMatch(/respondWith\(fetch\(/);
  });
});

describe('Apple web app meta', () => {
  it('emits apple-mobile-web-app-capable in the root layout', () => {
    const layout = readFileSync(resolve('app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/apple-mobile-web-app-capable/);
    expect(layout).toMatch(/appleWebApp:\s*\{[\s\S]*capable:\s*true/);
  });
});
