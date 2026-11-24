# Invoice Laboratory for iPhone — App Store checklist

Branch `feat/ios-app-store`. Capacitor 8 (Swift Package Manager) + custom StoreKit 2 Swift plugin + Xcode Cloud.
Web (Vercel) behaviour is unchanged: every iOS-only path is gated by `isNativeIos()` / the `InvoiceLabIOS/1.0`
user-agent token that only the app sends.

## Identity

| | |
|---|---|
| Bundle ID | `com.colecollins.invoicelab` |
| Display name | Invoice Lab (App Store name suggestion: **Invoice Lab: Estimates & Bills**) |
| URL scheme | `invoicelab://` (e.g. `invoicelab://invoices/<id>`, `invoicelab://estimates/new`) |
| Devices | iPhone only (`TARGETED_DEVICE_FAMILY = 1`), portrait, iOS 15+ |
| Category | Business (secondary: Finance) · Age rating 4+ |
| Encryption | `ITSAppUsesNonExemptEncryption = NO` (HTTPS only) |
| Subscription group | **Invoice Lab Pro** |
| Products | `com.colecollins.invoicelab.pro.monthly` ($29.99/mo) · `com.colecollins.invoicelab.pro.yearly` ($299.99/yr) — both with a **14-day free trial** introductory offer |
| Xcode scheme | `App` (shared), StoreKit test config `ios/App/App/InvoiceLab.storekit` |

## How the app is built

* The signed-in product is server-rendered Next.js + Postgres, so the WebView loads production
  (`server.url = https://invoice-payments-two.vercel.app`, starts at `/dashboard`).
* `ios-shell/` is bundled in the binary. `offline.html` is the Capacitor `server.errorPath`: with no connection
  the app opens a native-feeling offline mode (cached clients + invoices, offline invoice drafts, CSV share, Face ID lock)
  served from `capacitor://localhost`. Drafts upload from **Settings › iPhone app › Offline drafts** (`/ios/drafts`) when back online.
* Native code: `ios/App/App/InvoiceLabNativePlugin.swift` (JS name `InvoiceLabNative`), registered by
  `InvoiceLabViewController.swift`; privacy cover in `SceneDelegate.swift`.
* Web glue: `components/native/NativeBridge.tsx` (mounted in `app/layout.tsx`), `lib/native/*`, `proxy.ts`.

## Guideline map

| Guideline | What we did |
|---|---|
| **4.2 Minimum functionality** | Native share sheet for invoice **PDFs** (`window.print()` → `sharePdf`: paginated US-Letter PDF from the print stylesheet → Mail / Messages / AirDrop / Files / Print) and CSV/JSON exports (`shareFile`). Offline mode with on-device cache (Preferences) and offline drafts. Face ID / Touch ID / passcode app lock. Local overdue / due-date reminder notifications (no amounts on the lock screen). Haptics, theme-aware status bar, app-switcher privacy cover, `invoicelab://` deep links, notification taps route into the invoice. Camera / photo library for photo estimates. |
| **4.2 / web-clip prompts** | The PWA “Add to Home Screen” hint and service worker are suppressed in the app (`lib/pwa.ts`, `components/PwaSupport.tsx`). |
| **3.1.1 In-app purchase** | Inside the app the Stripe Payment Links, `ALFOUNDING` founding-pilot link, card-required web trial, `/pricing`, `/welcome` and the Stripe billing portal are hidden or redirected (`proxy.ts` sends `/`, `/welcome` → `/dashboard` and `/pricing` → `/ios/upgrade`). Upgrades go to the StoreKit 2 paywall (`/ios/upgrade`): localized prices, 14-day free trial when eligible, **Restore Purchases**, **Manage subscription**, auto-renew terms, EULA + privacy links. |
| **3.1.2 Subscriptions** | Auto-renewable, ongoing value (unlimited photo estimates, options, change orders, layouts). Required disclosures on the paywall; Terms at `/terms`, Privacy at `/privacy`, Apple standard EULA linked. |
| **3.1.3(b) Multiplatform** | Pro bought on the web (Stripe) is honoured in the app after sign-in; Pro is also purchasable in-app via StoreKit. |
| **3.1.3(e) Real-world services** (the brief cited 3.1.5; 3.1.3(e) is the applicable rule) | The payment links/“Pay” buttons contractors put on invoices are for their own real-world services and are paid by *their* clients — left untouched (`/pay`, `/i`, `/portal`, Studio checkout). |
| **5.1.1(v) Account deletion** | **Settings › Delete account** (web and app): type `DELETE` + password → `DELETE /api/account` cancels any Stripe subscription, then deletes every user-owned row in one transaction (`lib/account-deletion.ts`) and clears the on-device cache. Explains how to cancel an App Store subscription. |
| **4.8 Sign in with Apple** | **Not required today**: the only login is email + password (`CredentialsProvider` in `lib/authOptions.ts`); there is no Google/Facebook/etc. If a third-party login is ever added, Sign in with Apple must ship alongside it — see below. |
| **5.1.2 / privacy manifest** | `ios/App/App/PrivacyInfo.xcprivacy`: no tracking; declared collected data + required-reason APIs (UserDefaults `CA92.1`, file timestamps `C617.1`). |

### If a social login is added later (Guideline 4.8)

1. Apple Developer › Identifiers: enable **Sign in with Apple** on `com.colecollins.invoicelab`; create a **Services ID**
   (e.g. `com.colecollins.invoicelab.web`) with domain `invoice-payments-two.vercel.app` and return URL
   `https://invoice-payments-two.vercel.app/api/auth/callback/apple`.
2. Keys: create a Sign in with Apple key (.p8), note Key ID + Team ID; generate the client-secret JWT.
3. Add `AppleProvider` from `next-auth/providers/apple` next to the social provider with `APPLE_ID` (Services ID) and
   `APPLE_SECRET`; `cookies` must allow `SameSite=None` for Apple’s form_post callback.
4. In Xcode add the *Sign in with Apple* capability; show the Apple button at least as prominently as the others.

## App Privacy (“nutrition label”) answers

Data is **linked to the user**, **not used for tracking**, purpose **App Functionality** only:
Contact Info (name, email, phone, physical address — the user’s and their clients’), Financial Info (other: invoices/payment records),
User Content (photos, other content), Purchases (purchase history), Identifiers (user ID).
No third-party advertising or analytics SDKs.

## One-time setup (manual, in order)

1. **Database migration** (before deploying this branch): `npx prisma migrate deploy` against Supabase applies
   `20261123120000_apple_subscriptions` (additive `AppleSubscription` table). Delete Account and the App Store sync
   route need it. Nothing else changes.
2. **Vercel env**: set `NEXT_PUBLIC_SUPPORT_EMAIL` (shown on `/privacy` and `/terms`); redeploy.
3. **App Store Connect**
   * Sign the **Paid Apps Agreement** (banking + tax) and apply to the **App Store Small Business Program** (15%).
   * New app → bundle ID `com.colecollins.invoicelab`, SKU `invoicelab-ios`.
   * Subscriptions → group **Invoice Lab Pro** → add the two product IDs above; prices $29.99 / $299.99 (or your choice);
     Introductory Offer → **Free trial, 2 weeks**, all territories; localized name/description; review screenshot of `/ios/upgrade`.
   * App Information → **App Store Server Notifications V2** URL (Production and Sandbox):
     `https://invoice-payments-two.vercel.app/api/iap/apple/notifications`.
   * Privacy Policy URL `https://invoice-payments-two.vercel.app/privacy`; Terms / EULA: Apple standard (already linked).
   * App Privacy answers from the section above.
4. **Xcode Cloud**: connect `DealPatrol/Invoice-payments-`, workflow on `feat/ios-app-store`/`main`, scheme `App`,
   Archive → TestFlight. `ios/App/ci_scripts/ci_post_clone.sh` runs `npm ci && npx cap sync ios` (no Next build needed).
   Automatic signing with your team; In-App Purchase capability is on by default for the App ID.
5. **First compile check (needs a Mac or Xcode Cloud)**: open `ios/App/App.xcodeproj`, Product › Scheme › Edit Scheme › Run › Options:
   confirm **StoreKit Configuration = InvoiceLab.storekit** (re-select it if Xcode shows it missing), run on a simulator, buy
   monthly in the local StoreKit sandbox, then Restore.
6. **Reviewer account**: create a real account on production (e.g. `appreview+invoicelab@…`) with a few clients, an estimate,
   and an overdue invoice so reminders, PDF share and offline mode have data. Put the credentials in App Review Information.

## App Review notes (paste into App Store Connect)

> Invoice Lab helps contractors turn job-site photos into estimates and invoices. Sign in with the demo account provided.
> Native features: Settings › iPhone app (Face ID lock, overdue-invoice reminders), menu › Invoice Studio › open an invoice ›
> PDF opens the iOS share sheet with a paginated PDF (Mail, Messages, AirDrop, Files, Print); CSV exports use the share sheet too, Airplane Mode shows offline mode with cached clients/invoices and offline drafts,
> `invoicelab://invoices` deep links. Pro is an auto-renewable subscription (14-day free trial) under Settings › iPhone app ›
> Get Pro, with Restore Purchases. Payment links on invoices are for contractors’ own real-world services and are paid by their
> customers (3.1.3(e)). Account deletion: Settings › Delete account.

## Developer notes

* `npm run ios:sync` after changing `capacitor.config.ts` or `ios-shell/`; `npm run ios:open` opens Xcode.
* Purchases: device sends StoreKit 2 JWS → `POST /api/iap/apple/sync` → `lib/apple-iap.ts` verifies the x5c chain against the
  pinned **Apple Root CA – G3**, Apple marker OIDs and the ES256 signature, checks bundle/product/expiry/revocation and the
  `appAccountToken` (UUID derived from the account id), then sets `plan = pro`. Expiry/refund only downgrades when Apple
  granted Pro (never a Stripe subscriber). Renewals/refunds also arrive via Server Notifications.
* iOS-only UI uses `useIsNativeIos()`; pre-paint CSS hooks `.web-only` / `.native-only` key off `html[data-native="ios"]`.
* Tests: `tests/apple-iap.test.ts` (real chain verification with a throwaway openssl chain), `tests/native-ios.test.ts`,
  `tests/account-deletion.test.ts`, `tests/ios-project.test.ts`.

## Known risks (honest)

* **Remote content (4.2 / 2.5.2)**: the main UI is served from the web. The offline mode, PDF share sheet, Face ID, reminders and
  StoreKit make it a real native client, but a strict reviewer can still call it a wrapper. If rejected, the next step is moving
  more screens (invoice list/detail) into bundled native views.
* **Server-side 14-day trial**: every new account still gets the existing 14-day Pro trial from the backend (no card, also on
  iOS). Apple prefers trials through IAP; if flagged, gate the server trial to web sign-ups or rely on the StoreKit intro offer.
* Pro-limit error messages from the API still mention “$29/mo” (plain text, no link). Low risk; change the copy if Review objects.
* Solo ($19) is web-only; the app sells Pro only.
* Studio data that lives only in `localStorage` (signed-out Studio use) can be evicted by iOS under storage pressure; signed-in
  users are cloud-synced.
* Swift has not been compiled yet (built on Linux). It targets Capacitor 8 / StoreKit 2 APIs (iOS 15+); first Xcode build may
  need small fixes.
