import { readFileSync, existsSync } from 'fs';
import { describe, expect, it } from 'vitest';
import config from '../capacitor.config';
import { BUNDLE_ID, PRO_PRODUCT_IDS } from '../mobile/src/lib/config';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const exists = (p: string) => existsSync(new URL(`../${p}`, import.meta.url));

describe('Invoice Jot iOS project wiring', () => {
  it('capacitor config bundles the app locally (Guideline 4.2): no remote server.url', () => {
    expect(config.appId).toBe('com.frontporchgrowth.invoicejot');
    expect(config.appId).toBe(BUNDLE_ID);
    expect(config.appName).toBe('Invoice Jot');
    expect(config.webDir).toBe('mobile/dist');
    expect(config.server?.url).toBeUndefined();
    expect(exists('mobile/index.html')).toBe(true);
  });

  it('Info.plist: display name, encryption flag, camera/photos strings and the invoicejot:// scheme', () => {
    const plist = read('ios/App/App/Info.plist');
    expect(plist).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>Invoice Jot<\/string>/);
    expect(plist).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
    for (const key of ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription']) expect(plist).toContain(`<key>${key}</key>`);
    expect(plist).not.toContain('NSFaceIDUsageDescription');
    expect(plist).toMatch(/<string>invoicejot<\/string>/);
  });

  it('StoreKit config: $4.99 weekly, $9.99 monthly and $59.99 yearly in one group, no free-trial introductory offer', () => {
    const sk = JSON.parse(read('ios/App/App/InvoiceJot.storekit'));
    const subs = sk.subscriptionGroups.flatMap((g: { subscriptions: unknown[] }) => g.subscriptions) as Array<{ productID: string; displayPrice: string; recurringSubscriptionPeriod: string; introductoryOffer?: unknown }>;
    expect(subs.map((s) => s.productID).sort()).toEqual([...PRO_PRODUCT_IDS].sort());
    const byId = Object.fromEntries(subs.map((s) => [s.productID, s]));
    expect(byId['com.frontporchgrowth.invoicejot.pro.monthly']).toMatchObject({ displayPrice: '9.99', recurringSubscriptionPeriod: 'P1M' });
    expect(byId['com.frontporchgrowth.invoicejot.pro.yearly']).toMatchObject({ displayPrice: '59.99', recurringSubscriptionPeriod: 'P1Y' });
    expect(byId['com.frontporchgrowth.invoicejot.pro.weekly']).toMatchObject({ displayPrice: '4.99', recurringSubscriptionPeriod: 'P1W' });
    expect(sk.subscriptionGroups).toHaveLength(1);
    expect(sk.subscriptionGroups[0].name).toBe('Invoice Jot Pro');
    // Upgrade order inside the group: yearly (1) > monthly (2) > weekly (3).
    expect([1, 2, 3].map((n) => subs.find((s) => (s as { groupNumber?: number }).groupNumber === n)?.productID)).toEqual([
      'com.frontporchgrowth.invoicejot.pro.yearly',
      'com.frontporchgrowth.invoicejot.pro.monthly',
      'com.frontporchgrowth.invoicejot.pro.weekly',
    ]);
    for (const s of subs) expect(s.introductoryOffer).toBeUndefined();
  });

  it('Xcode project compiles the StoreKit plugin + bridge VC and bundles the privacy manifest', () => {
    const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
    expect(pbx).toContain('InvoiceJotPlugin.swift in Sources');
    expect(pbx).toContain('BridgeViewController.swift in Sources');
    expect(pbx).toContain('PrivacyInfo.xcprivacy in Resources');
    expect(pbx).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.frontporchgrowth.invoicejot;');
    expect(read('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme')).toContain('InvoiceJot.storekit');
    const privacy = read('ios/App/App/PrivacyInfo.xcprivacy');
    expect(privacy).toContain('<key>NSPrivacyTracking</key>\n\t<false/>');
    // Only the optional Stripe card-payments feature collects anything: financial info + the Stripe account id,
    // linked to the user, for app functionality, never tracking.
    const collected = [...privacy.matchAll(/<string>(NSPrivacyCollectedDataType[A-Za-z]+)<\/string>/g)].map((x) => x[1]).filter((t) => !t.startsWith('NSPrivacyCollectedDataTypePurpose'));
    expect(collected.sort()).toEqual(['NSPrivacyCollectedDataTypeOtherFinancialInfo', 'NSPrivacyCollectedDataTypeUserID']);
    expect(privacy).not.toMatch(/<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<true\/>/);
    expect(privacy).not.toContain('NSPrivacyCollectedDataTypeEmailAddress');
  });

  it('Swift plugin is a CAPBridgedPlugin registered in BridgeViewController', () => {
    const plugin = read('ios/App/App/InvoiceJotPlugin.swift');
    expect(plugin).toContain('CAPBridgedPlugin');
    expect(plugin).toContain('public let jsName = "InvoiceJotStore"');
    for (const m of ['getProducts', 'purchase', 'restorePurchases', 'getEntitlements', 'manageSubscriptions', 'requestReview']) expect(plugin).toContain(`name: "${m}"`);
    expect(plugin).toContain('AppStore.sync()');
    expect(plugin).toContain('Transaction.updates');
    expect(read('ios/App/App/BridgeViewController.swift')).toContain('registerPluginInstance(InvoiceJotPlugin())');
    expect(read('ios/App/App/SceneDelegate.swift')).toContain('BridgeViewController()');
  });

  it('Xcode Cloud builds the local bundle before cap sync', () => {
    const ci = read('ios/App/ci_scripts/ci_post_clone.sh');
    expect(ci.indexOf('npm run mobile:build')).toBeGreaterThan(-1);
    expect(ci.indexOf('npm run mobile:build')).toBeLessThan(ci.indexOf('npx cap sync ios'));
  });

  it('every bundle / product identifier lives under com.frontporchgrowth.invoicejot', () => {
    const files = ['capacitor.config.ts', 'ios/App/App/Info.plist', 'ios/App/App.xcodeproj/project.pbxproj', 'ios/App/App/InvoiceJot.storekit', 'mobile/src/lib/config.ts', 'lib/native/iap.ts'];
    for (const f of files) {
      const ids = read(f).match(/\bcom\.[a-z0-9]+\.[a-z0-9.]+/g) ?? [];
      for (const id of ids.filter((x) => !x.startsWith('com.apple.'))) expect(id.startsWith('com.frontporchgrowth.invoicejot')).toBe(true);
    }
  });
});
