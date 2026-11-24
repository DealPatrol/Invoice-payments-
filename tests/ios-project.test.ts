import { readFileSync, statSync } from 'fs';
import { describe, expect, it } from 'vitest';
import config from '../capacitor.config';
import { IOS_BUNDLE_ID, IOS_PRO_PRODUCT_IDS } from '@/lib/native/iap';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('iOS project wiring', () => {
  it('capacitor config matches the App Store record', () => {
    expect(config.appId).toBe(IOS_BUNDLE_ID);
    expect(config.server?.url).toBe('https://invoice-payments-two.vercel.app');
    expect(config.server?.errorPath).toBe('offline.html');
    expect(config.appendUserAgent).toMatch(/^InvoiceLabIOS\/\d/);
    expect(statSync(new URL('../ios-shell/offline.html', import.meta.url)).isFile()).toBe(true);
  });

  it('Info.plist declares encryption, Face ID, camera/photos, and the invoicelab:// scheme', () => {
    const plist = read('ios/App/App/Info.plist');
    expect(plist).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
    for (const key of ['NSFaceIDUsageDescription', 'NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription']) expect(plist).toContain(`<key>${key}</key>`);
    expect(plist).toMatch(/<string>invoicelab<\/string>/);
  });

  it('StoreKit config defines both Pro subscriptions with a 14-day free trial', () => {
    const sk = JSON.parse(read('ios/App/App/InvoiceLab.storekit'));
    const subs = sk.subscriptionGroups.flatMap((g: { subscriptions: unknown[] }) => g.subscriptions) as Array<{ productID: string; introductoryOffer: { paymentMode: string; subscriptionPeriod: string } }>;
    expect(subs.map((s) => s.productID).sort()).toEqual([...IOS_PRO_PRODUCT_IDS].sort());
    for (const s of subs) expect(s.introductoryOffer).toMatchObject({ paymentMode: 'free', subscriptionPeriod: 'P2W' });
  });

  it('Xcode project compiles the native plugin and bundles the privacy manifest', () => {
    const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
    expect(pbx).toContain('InvoiceLabNativePlugin.swift in Sources');
    expect(pbx).toContain('InvoiceLabViewController.swift in Sources');
    expect(pbx).toContain('PrivacyInfo.xcprivacy in Resources');
    expect(pbx).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.colecollins.invoicelab;');
    expect(read('ios/App/App/PrivacyInfo.xcprivacy')).toContain('<key>NSPrivacyTracking</key>\n\t<false/>');
    expect(read('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme')).toContain('InvoiceLab.storekit');
  });
});
