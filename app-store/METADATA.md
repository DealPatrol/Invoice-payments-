# Invoice Jot — App Store Connect metadata

Bundle ID `com.frontporchgrowth.invoicejot` · SKU `invoicejot-ios` · Primary category **Business** · Secondary **Productivity** · Age rating 4+ · Price: Free (with in-app subscriptions)

| Field | Value | Limit |
|---|---|---|
| App name (title) | `Invoice Jot: Estimate Maker` | 27 / 30 |
| Subtitle | `Receipts, Quotes & Get Paid` | 27 / 30 |
| Keywords | `generator,template,pdf,contractor,business,small,handyman,freelance,offline,tax,bill,billing,simple` | 99 / 100 |
| Promotional text | `No account. Works offline. Make an invoice or estimate in a minute and send the PDF from the job.` | ≤170 |
| Support URL | https://invoicejot.com/support | |
| Marketing URL | https://invoicejot.com | |
| Privacy Policy URL | https://invoicejot.com/privacy | |
| Terms (EULA) | Apple standard EULA + https://invoicejot.com/terms (add to the description footer) | |
| Copyright | `2026 Front Porch Growth` | |

Keyword notes: words already in the title/subtitle (invoice, estimate, maker, receipts, quotes, paid) are not repeated; Apple indexes title + subtitle + keywords together, so "invoice generator", "invoice template", "estimate maker", "receipt maker", "quote app", "billing app" are all covered.

## Description

```
Jot it. Send it. Get paid.

Invoice Jot is the fastest way to make an invoice or estimate on your iPhone — with no account, no sign-up and no internet required. Everything stays on your phone.

MAKE AN INVOICE IN A MINUTE
• Add your client, list the work, and tap Send — a clean PDF goes out by text, email or AirDrop
• Saved items and clients autofill, so the next invoice is even faster
• Tax, discounts, deposits and partial payments do the math for you
• Your logo and brand color on every PDF. Three styles are free (Modern, Classic, Bold); five more (Formal, Minimal, Banded, Ledger, Compact) come with Pro

ESTIMATES THAT TURN INTO INVOICES
• Quote the job, add a deposit, and convert to an invoice in one tap when the client says yes
• Mark estimates accepted or declined

GET PAID FASTER
• Add your own payment link (Stripe, Square, PayPal, Venmo) and it prints as a tappable "Pay online" link on every invoice — money goes straight to you
• See what's outstanding and overdue at a glance; mark invoices paid in one tap
• One-tap payment reminder for any unpaid invoice (free, sent from your own phone)
• Jot never touches your money: no payout holds, no processing fees, no frozen balance

RECEIPTS FOR TAX TIME
• Snap job expense receipts and keep them with your records
• Export documents, payments, clients and receipts to CSV for your bookkeeper

PRIVATE AND YOURS
• No account, no tracking, no ads
• Works fully offline
• Back up everything to Files or iCloud Drive and restore anytime, with a gentle reminder so nothing is ever lost
• Every invoice you've ever sent stays free to view and export — always

BUILT FOR
Plumbers, electricians, HVAC, handymen, contractors, landscapers, cleaners, painters, photographers, freelancers and every small business that needs to bill a job.

FREE AND PRO — NO SURPRISES
Free: unlimited drafts, estimates, clients and receipts, and your first 3 invoices to send. The app tells you how many free sends you have left before every send, so the paywall is never a surprise.
Invoice Jot Pro: unlimited invoices, no "Made with Invoice Jot" footer, and five extra PDF styles — $4.99/week, $9.99/month or $59.99/year.

Payment is charged to your Apple Account at confirmation of purchase. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in Settings › Apple Account › Subscriptions.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://invoicejot.com/privacy
```

## Screenshots (6.9" and 6.5"; captions)

1. **Send an invoice in 60 seconds** — invoice view with "Send invoice PDF"
2. **No account. Works offline.** — onboarding screen (business name only)
3. **Estimates → invoices in one tap** — estimate with deposit and "Convert to invoice"
4. **See who owes you** — home dashboard: Outstanding / Overdue / Paid this month
5. **Your logo, your look** — PDF preview (Modern style) with Pay online link
6. **Receipts ready for tax time** — receipts list with photos + CSV export

Capture on an iPhone 16 Pro Max simulator from a build with sample data (Business: "Rivera Plumbing"; fictional clients only).

## App Privacy (nutrition label)

**Data Not Collected.** No tracking. No third-party SDKs. (The app has no server; StoreKit purchase data is handled by Apple.) Matches `ios/App/App/PrivacyInfo.xcprivacy` (no collected data types).

## In-app purchases (subscription group "Invoice Jot Pro")

| Reference name | Product ID | Duration | Price | Intro offer |
|---|---|---|---|---|
| Invoice Jot Pro Yearly | `com.frontporchgrowth.invoicejot.pro.yearly` | 1 year | $59.99 | **None** |
| Invoice Jot Pro Monthly | `com.frontporchgrowth.invoicejot.pro.monthly` | 1 month | $9.99 | **None** |
| Invoice Jot Pro Weekly | `com.frontporchgrowth.invoicejot.pro.weekly` | 1 week | $4.99 | **None** |

All three go in the SAME subscription group so a user can only hold one; switching is an upgrade/downgrade, never a second charge. Group levels: Yearly = 1 (highest), Monthly = 2, Weekly = 3.

Display names: "Invoice Jot Pro Yearly" / "Invoice Jot Pro Monthly" / "Invoice Jot Pro Weekly". Description: "Unlimited invoices and no PDF footer." Upload a paywall screenshot for review on each product.

Paywall honesty: each plan shows its own price per its own period ($4.99/week, $9.99/month, $59.99/year). The yearly card says "about $5.00/month, billed once a year · saves 49% vs monthly, 76% vs weekly"; the monthly card says "saves 53% vs weekly"; the weekly card says "about $21.62/month if kept all year" — computed from the live StoreKit prices (12 months / 52 weeks) and rounded down, never up. No trial, no toggle, Restore Purchases on the paywall and in Settings.

## App Review notes (paste into "Notes")

```
Invoice Jot is local-first: there is NO login, NO account and NO server. All data is stored on the device (IndexedDB + an atomic JSON copy in the app's Library folder), so the reviewer can use every feature immediately and offline.

How to test:
1. Launch → the first screen states the free-plan limits and Pro prices up front → enter any business name (or tap "Skip for now").
2. Home → "+ New invoice" → add a client name and a line item → Done → "Send invoice PDF" opens the iOS share sheet (Save to Files works).
3. Repeat to send 3 invoices. Creating a 4th invoice is allowed (unlimited drafts), but sending/exporting it opens the Invoice Jot Pro paywall. Previously sent invoices remain viewable and re-shareable for free.
4. Paywall: weekly ($4.99), monthly ($9.99) and yearly ($59.99) auto-renewable subscriptions in one group via StoreKit 2. There is no free trial. "Restore Purchases" is on the paywall and in Settings; "Manage subscription" opens Apple's manage-subscriptions sheet.
5. Mark an invoice Paid → the standard SKStoreReviewController prompt may appear (system-throttled).
6. Unpaid sent invoices show "Send a payment reminder (free)": it only opens the iOS share sheet with a prewritten message. Settings → "Report a problem" opens a pre-filled email in the Mail app showing exactly what would be sent (app version and counts only); nothing is sent automatically. A dismissible "Back up your invoices" card appears on Home after a couple of weeks of use and links to the same Files/iCloud Drive backup as Settings.

Payments: digital features are sold only through In-App Purchase. Users may add their OWN payment link (e.g. Stripe/Square/PayPal) which is printed on invoices so THEIR clients can pay them for real-world services (plumbing, landscaping, etc.) — Guideline 3.1.3(e). The app never processes those payments.

Camera/Photos are used only when the user taps "Take photo"/"Choose photo" for receipt photos or a logo.

Data deletion: Settings → "Delete all data on this iPhone" (no server-side account exists, so Guideline 5.1.1(v) account deletion does not apply).
Contact: support@invoicejot.com
```
