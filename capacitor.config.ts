import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Invoice Jot for iOS (Capacitor 8, Swift Package Manager).
 *
 * Local-first: the whole app (mobile/, a Vite + React SPA) is bundled into the binary and served
 * from capacitor://localhost. There is no `server.url` and no login; data lives in
 * IndexedDB plus an atomic JSON snapshot in the app's Library folder (mobile/src/lib/storage.ts).
 * Native: StoreKit 2 + review prompt (ios/App/App/InvoiceJotPlugin.swift), share sheet, Files,
 * camera, haptics. The only network feature is optional Stripe card payments via invoicejot.com
 * (mobile/src/lib/cardPayments.ts, STRIPE_CONNECT.md).
 */
const config: CapacitorConfig = {
  appId: 'com.frontporchgrowth.invoicejot',
  appName: 'Invoice Jot',
  webDir: 'mobile/dist',
  ios: {
    scheme: 'App', // shared Xcode scheme (ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme)
    contentInset: 'never', // the web UI pads with env(safe-area-inset-*)
    backgroundColor: '#f6f4ef',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: { launchShowDuration: 600, launchAutoHide: false, backgroundColor: '#f6f4ef', showSpinner: false },
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
  },
};

export default config;
