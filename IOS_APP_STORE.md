# Invoice Jot for iOS — build & release checklist

| | |
|---|---|
| App name | Invoice Jot (`Invoice Jot: Estimate Maker`) |
| Bundle ID | `com.frontporchgrowth.invoicejot` |
| Stack | Capacitor 8 (Swift Package Manager) + Vite/React app in `mobile/` bundled locally (no `server.url`) |
| Products | One subscription group "Invoice Jot Pro": `com.frontporchgrowth.invoicejot.pro.weekly` ($4.99/wk) · `com.frontporchgrowth.invoicejot.pro.monthly` ($9.99/mo) · `com.frontporchgrowth.invoicejot.pro.yearly` ($59.99/yr) — **no free trial / intro offer** |
| Free plan | Unlimited drafts, estimates, clients, items, receipts; first 3 invoices sendable; past invoices always viewable/exportable |
| Get paid with card | Optional Stripe Connect (Accounts v2, direct charges, 1% platform fee) — see `STRIPE_CONNECT.md`. App: `mobile/src/lib/cardPayments.ts`, `screens/GetPaid.tsx`, `screens/CardPaySection.tsx`. Server: `lib/connect/*`, `app/api/connect/*`, `app/pay-online/[token]`. Not used for Pro. |
| App Privacy | Other Financial Info + User ID, linked, App Functionality, no tracking (only when the user opts into card payments) — see `app-store/METADATA.md` |
| Metadata | `app-store/METADATA.md` (title, subtitle, keywords, description, captions, review notes, privacy label) |

## Architecture
* `mobile/` — the whole iPhone app (React 19 + Vite). Built to `mobile/dist`, copied into `ios/App/App/public` by `npx cap sync ios`. Works offline, no login.
  * `src/lib/storage.ts` — IndexedDB + atomic JSON snapshot (`Library/InvoiceJot/invoicejot-db.json` + `.prev`) so iOS WebKit storage eviction can't lose data.
  * `src/lib/db.ts`, `calc.ts`, `gate.ts` — data model, totals, free-plan gate (`FREE_INVOICE_SENDS = 3`), review-prompt timing, PDF footer rule.
  * `src/lib/pdf.ts` — jsPDF invoices/estimates (3 styles, logo, payment link, deposit, free footer). Also used by the web free generator.
  * `src/lib/exporters.ts` — CSV (documents, payments, clients, receipts) and JSON backup/restore.
  * `src/lib/storekit.ts` — JS side of the StoreKit plugin (`InvoiceJotStore`).
* `ios/App/App/InvoiceJotPlugin.swift` — `CAPBridgedPlugin`: StoreKit 2 products/purchase/restore (`AppStore.sync`)/entitlements/`Transaction.updates`/manage subscriptions + `AppStore.requestReview`. Registered in `BridgeViewController.swift`.
* `ios/App/App/InvoiceJot.storekit` — local StoreKit testing config (selected in the shared `App` scheme).
* `PrivacyInfo.xcprivacy` — no tracking, no collected data; required-reason APIs: UserDefaults (CA92.1), file timestamps (C617.1).
* Web (`app/`): Next.js marketing + SEO (templates, free generator, compare, glossary, support, privacy, terms, llms.txt, sitemap). The legacy signed-in web app is unchanged and not part of the iOS binary.

## Local commands
```
npm ci
npm run mobile:dev        # browser preview of the iPhone app (purchases disabled on web)
npm run ios:sync          # mobile:build + cap sync ios
npx cap open ios          # Xcode
npm run typecheck && npm test && npm run lint && npm run build
```

## Manual steps before submission
1. **Apple Developer** → Identifiers → register `com.frontporchgrowth.invoicejot` (In-App Purchase capability is on by default).
2. **App Store Connect** → New App → name `Invoice Jot: Estimate Maker`, bundle ID above, SKU `invoicejot-ios`.
3. **Agreements, Tax, and Banking** → accept the **Paid Apps Agreement**; enroll in the **App Store Small Business Program** (15% commission).
4. **Subscriptions** → group "Invoice Jot Pro" → create both products exactly as in `app-store/METADATA.md` (no introductory offer), add localization + review screenshot, submit with the first build.
5. **Xcode Cloud** → Product › Xcode Cloud › Create Workflow on the `App` scheme, branch `main` (after merge) or this branch for TestFlight; `ios/App/ci_scripts/ci_post_clone.sh` installs Node, builds `mobile/` and runs `cap sync`. Set the signing team (Automatic).
6. **App Privacy** → "Data Not Collected".
7. **Domain** → point `invoicejot.com` at the Vercel project (A `76.76.21.21` / CNAME `cname.vercel-dns.com`), set `NEXT_PUBLIC_SITE_URL=https://invoicejot.com`, create the `support@invoicejot.com` mailbox/forward.
8. After the app has an App Store ID → set `NEXT_PUBLIC_APP_STORE_ID` in Vercel to switch on the Smart App Banner and App Store links.
9. Screenshots: 6.9" + 6.5" sets with the captions in METADATA.md.
