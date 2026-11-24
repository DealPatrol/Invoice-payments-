import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Invoice Laboratory for iOS (Capacitor 8, Swift Package Manager).
 *
 * The signed-in app is server-rendered (Next.js + Postgres), so the WebView loads the live
 * production origin. Everything that has to work without a network ships inside the binary
 * in `ios-shell/` (offline drafts + cached clients/invoices, served from capacitor://localhost
 * through `server.errorPath`). Native features (StoreKit 2, Face ID lock, PDF share sheet,
 * reminders, deep links) are wired in `components/native/NativeBridge.tsx` and
 * `ios/App/App/InvoiceLabNativePlugin.swift`, and only switch on inside this app (`isNativeIos()`).
 */
const config: CapacitorConfig = {
  appId: 'com.colecollins.invoicelab',
  appName: 'Invoice Lab',
  webDir: 'ios-shell',
  // Lets the server and the page know they are inside the App Store build (see lib/native/platform.ts).
  appendUserAgent: 'InvoiceLabIOS/1.0',
  server: {
    url: 'https://invoice-payments-two.vercel.app',
    appStartPath: 'dashboard',
    errorPath: 'offline.html',
  },
  ios: {
    scheme: 'App', // shared Xcode scheme (ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme)
    contentInset: 'never', // the web UI already pads with env(safe-area-inset-*)
    backgroundColor: '#f3efe6',
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 800, launchAutoHide: true, backgroundColor: '#8c4a22', showSpinner: false },
    LocalNotifications: { iconColor: '#8c4a22' },
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
  },
};

export default config;
