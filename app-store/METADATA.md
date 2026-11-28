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
• Get paid by card: connect your own Stripe account and add a "Pay online" link to any invoice; clients pay by card or Apple Pay and you tap Check payment to mark it paid (optional; Stripe's fee plus 1% per card payment, no monthly fee)
• Or add your own payment link (Square, PayPal, Venmo) and it prints as a tappable "Pay online" link on every invoice — money goes straight to you
• See what's outstanding and overdue at a glance; mark invoices paid in one tap
• One-tap payment reminder for any unpaid invoice (free, sent from your own phone)
• Your money goes to your own Stripe or payment account, never through ours

RECEIPTS FOR TAX TIME
• Snap job expense receipts and keep them with your records
• Export documents, payments, clients and receipts to CSV for your bookkeeper

PRIVATE AND YOURS
• No Invoice Jot account, no tracking, no ads
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

No longer "Data Not Collected" — the optional **Get paid with card** (Stripe Connect) feature sends payment data through invoicejot.com to Stripe, and those records are kept in the user's Stripe account. Answer App Store Connect › App Privacy like this:

* **Data used to track you:** none. **No third-party SDKs**, no ads, no analytics.
* **Data linked to you:**
  * **Financial Info → Other Financial Info** (invoice amount, currency and invoice number sent when the user makes a card payment link; payment status read back). Purpose: **App Functionality**. Linked: **Yes** (tied to the user's Stripe account). Tracking: **No**.
  * **Identifiers → User ID** (the user's Stripe connected-account id, sent with each card-payment request). Purpose: **App Functionality**. Linked: **Yes**. Tracking: **No**.
* **Not collected:** contact info, client names/emails/addresses, line items, location, photos, usage data, diagnostics. Business/bank/identity details are entered on Stripe's own web pages (Stripe is the data controller for those), not in the app. Card details are entered by the payer on Stripe Checkout in a browser, not in the app.
* Apple's "optional feature" rule: data collected only when the user opts in must still be declared, hence the two entries above.

Matches `ios/App/App/PrivacyInfo.xcprivacy` (`NSPrivacyCollectedDataTypeOtherFinancialInfo` + `NSPrivacyCollectedDataTypeUserID`, linked, not tracking, App Functionality). StoreKit purchase data is handled by Apple and not collected by us.

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
Invoice Jot is local-first: there is NO login and NO Invoice Jot account. All invoices, clients and receipts are stored on the device (IndexedDB + an atomic JSON copy in the app's Library folder), so the reviewer can use every feature immediately and offline. The only network feature is the optional "Get paid with card" (Stripe), see below.

How to test:
1. Launch → the first screen states the free-plan limits and Pro prices up front → enter any business name (or tap "Skip for now").
2. Home → "+ New invoice" → add a client name and a line item → Done → "Send invoice PDF" opens the iOS share sheet (Save to Files works).
3. Repeat to send 3 invoices. Creating a 4th invoice is allowed (unlimited drafts), but sending/exporting it opens the Invoice Jot Pro paywall. Previously sent invoices remain viewable and re-shareable for free.
4. Paywall: weekly ($4.99), monthly ($9.99) and yearly ($59.99) auto-renewable subscriptions in one group via StoreKit 2. There is no free trial. "Restore Purchases" is on the paywall and in Settings; "Manage subscription" opens Apple's manage-subscriptions sheet.
5. Mark an invoice Paid → the standard SKStoreReviewController prompt may appear (system-throttled).
6. Unpaid sent invoices show "Send a payment reminder (free)": it only opens the iOS share sheet with a prewritten message. Settings → "Report a problem" opens a pre-filled email in the Mail app showing exactly what would be sent (app version and counts only); nothing is sent automatically. A dismissible "Back up your invoices" card appears on Home after a couple of weeks of use and links to the same Files/iCloud Drive backup as Settings.

7. Optional: More → "Get paid with card" → "Set up with Stripe" opens Stripe's own onboarding page in Safari (the reviewer does not need to complete it). After setup, an unpaid invoice shows "Add card payment link"; the PDF then carries a "Pay online" link to a Stripe-hosted checkout page, and "Check payment" marks the invoice paid once the client has paid.

Payments: digital features (Invoice Jot Pro) are sold ONLY through In-App Purchase; Stripe is never used for Pro and the paywall has no external links. "Get paid with card" lets the user's OWN clients pay the user for real-world services performed outside the app (plumbing, landscaping, cleaning, etc.) — Guideline 3.1.3(e) goods and services consumed outside the app. Each user connects their own Stripe account (Stripe Connect, direct charges; the user is the merchant of record). The client pays on Stripe Checkout in a web browser; Invoice Jot takes a 1% platform fee on those real-world service payments, disclosed before connecting. Users can instead paste their own payment link (Square/PayPal/Venmo), which is printed on invoices as before.

Camera/Photos are used only when the user taps "Take photo"/"Choose photo" for receipt photos or a logo.

Data deletion: Settings → "Delete all data on this iPhone" (also forgets any Stripe connection). There is no Invoice Jot server-side account, so Guideline 5.1.1(v) account deletion does not apply to Invoice Jot itself. The optional Stripe account belongs to the user; "Disconnect on this iPhone" removes it from the app and the user can close the Stripe account at any time from the Stripe Dashboard (linked in the app). Invoice Jot's server stores no data about it.
Contact: support@invoicejot.com
```
