# Invoice Jot — "Get paid with card" (Stripe Connect)

Lets Invoice Jot users get paid **by their own clients** for real-world work (App Review guideline 3.1.3(e)).
It never touches Invoice Jot Pro, which is sold only through StoreKit 2.

## Design (and why)

| Decision | Choice | Why |
|---|---|---|
| Connect API | **Accounts v2** (`POST /v2/core/accounts`), no legacy `type: express/standard` | Stripe's current recommendation for new platforms. |
| Account config | `dashboard: "full"`, `defaults.responsibilities.fees_collector: "stripe"`, `losses_collector: "stripe"`, `configuration.merchant.capabilities.card_payments.requested: true` | Invoice Jot is SaaS: each contractor runs their own business and owns the client relationship, so they are merchant of record. This is Stripe's GA "SaaS platform with payments" setup: Stripe bills its processing fees to the user's account and owns negative-balance risk, so Invoice Jot carries no dispute/loss exposure. (Express + Stripe-owned losses + direct charges is still public preview, so we did not pick it.) |
| Charge type | **Direct charges** on the connected account (`Stripe-Account` header) | Matches merchant of record; the payer sees the contractor's business on Checkout and their statement. |
| Checkout | **Stripe-hosted Checkout Session**, created when the client opens the link | No card UI in the app; dynamic payment methods (cards, Apple Pay, etc. as enabled in the user's Stripe settings). No `payment_method_types`. |
| Revenue | `payment_intent_data.application_fee_amount = floor(amount × INVOICEJOT_PLATFORM_FEE_BPS / 10000)` (default 100 bps = **1%**) | Because `fees_collector` is `stripe`, the 1% is net to Invoice Jot (Stripe's fee is charged to the user, not to us). |
| Free or Pro | **Available to everyone**, free and Pro | The fee is the revenue; gating it would only reduce volume. |
| Durable link | `https://invoicejot.com/pay-online/<token>`; token = signed (HMAC-SHA256) `{account, amount, currency, invoice #, random ref, issued-at}` | Checkout Sessions expire after 24 h, but invoices/PDFs live for weeks. Opening the link makes a fresh session. The amount can't be edited without breaking the signature. |
| State | **No database.** Paid status is read live from Stripe (PaymentIntents on the connected account with `metadata.invoicejot_ref`, created since the link was issued). The webhook writes `invoicejot_status=paid|failed` onto that PaymentIntent's metadata in the user's own account. | "Stateless where possible" and no customer PII on our side. |
| App auth (no login) | On account creation the server returns `accountKey = HMAC(INVOICEJOT_LINK_SECRET, "acct:"+acct_id)`; the app stores `{accountId, accountKey}` in Capacitor Preferences (iOS UserDefaults). Every status / onboarding-link / pay-link / invoice-status call needs both. | The `acct_` id appears inside public pay links, so the id alone must not be enough to manage the account or read its payments. |
| Double charge | Before creating a session the server checks succeeded payments for that ref; fully paid → "already paid" page; partly paid → charges only the remainder. | |

Data our server receives (and does not store): country + currency (connect), Stripe account id + key, invoice amount/currency/number + random ref (pay link). Never client name, email, address or line items. Vercel keeps normal request logs.

## Files

* Server: `lib/connect/{config,money,tokens,service,http,webhook}.ts`
* Routes: `POST /api/connect/accounts`, `POST /api/connect/onboarding-link`, `POST /api/connect/status`, `POST /api/connect/pay-links`, `POST /api/connect/invoice-status`, `POST /api/connect/webhook`, `GET /pay-online/[token]`
* Pages: `/connect/return` (Stripe onboarding return → `invoicejot://stripe/return`), `/connect/refresh` (expired link → back to app), `/paid` (payer success / cancelled / already paid / unavailable)
* App: `mobile/src/lib/cardPayments.ts`, `mobile/src/screens/GetPaid.tsx` (More › Get paid with card), `mobile/src/screens/CardPaySection.tsx` (on unpaid invoices)
* Tests: `tests/connect-api.test.ts` (routes with a mocked Stripe SDK), `tests/card-payments-app.test.ts`

## Env vars (Vercel project `prj_73ZvsdissXgxPPtyt4FYAdBeQTpA`)

| Name | Value | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | platform key, `sk_test_…` / `rk_test_…` first, live later | A **restricted key** is recommended. Needs write on: Connect (Accounts v2 + Account Links), Checkout Sessions, PaymentIntents. This var already exists for the old web app — check which Stripe account it points at before reusing it. |
| `INVOICEJOT_LINK_SECRET` | 32+ random chars (`openssl rand -base64 48`) | Signs account keys and pay links. **Never rotate casually**: rotating breaks every existing "Pay online" link and every phone's connection (users would reconnect). |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | `whsec_…` of the Connect webhook endpoint | Falls back to `STRIPE_WEBHOOK_SECRET` if unset, but that one is already used by the old `/api/webhooks/stripe` endpoint and a Connect endpoint has its own secret, so set this one. |
| `INVOICEJOT_PLATFORM_FEE_BPS` | `100` | Optional; default 100 (1%). Clamped 0–1000. If you change it, also change the "1%" copy in the app (`GetPaid.tsx`), terms, support and METADATA. |
| `NEXT_PUBLIC_SITE_URL` | `https://invoicejot.com` | Used for return/refresh/success URLs and pay links. |
| `INVOICEJOT_CONNECT_ALLOW_LIVE` | unset (test mode) | Safety switch: `sk_live_`/`rk_live_` keys are refused by the Connect routes until this is `true`. Set it only when going live. |
| `INVOICEJOT_CONNECT_ORIGINS` | optional, comma-separated | Extra CORS origins. `capacitor://localhost` (the iOS app) is allowed by default. |

## Stripe Dashboard steps (test mode / a sandbox first)

1. **Connect › Get started**: activate Connect for the platform account. Platform profile: business type "SaaS / software platform", "Sellers are independent businesses that collect payments directly" (direct charges). Industry: invoicing software for trades/small business.
2. **Connect › Settings › Onboarding / branding**: name "Invoice Jot", icon, brand color `#1f6f5c`, support email/URL (`https://invoicejot.com/support`), privacy (`/privacy`) and terms (`/terms`) URLs.
3. **Connect › Settings**: make sure the platform can create accounts with **Stripe-hosted onboarding** and the **full Stripe Dashboard** for connected accounts, with **Stripe** collecting fees and owning losses (the "SaaS / direct charges" path). No Platform Pricing Tool needed (we set `application_fee_amount` explicitly).
4. **Settings › Payment methods** (for connected accounts): leave cards + Apple Pay/Google Pay on; others optional. (Delayed methods like ACH are supported: the webhook marks them when they settle.)
5. **Developers › Webhooks › Add endpoint**:
   * URL: `https://invoicejot.com/api/connect/webhook`
   * **Listen to: Events on Connected accounts**
   * Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   * Copy the signing secret into `STRIPE_CONNECT_WEBHOOK_SECRET`.
6. Create a **restricted key** for `STRIPE_SECRET_KEY` (see above).
7. Live mode later: repeat 1–6 in live mode after Stripe reviews the platform; switch the env vars to live values.

## Test-mode walkthrough

1. Set the env vars above with **test** values on a Vercel preview (or `.env.local` + `npm run dev`).
2. In the app (simulator), More › Get paid with card › Set up with Stripe → Safari opens Stripe onboarding. In test mode use Stripe's test data (e.g. phone `000 000 0000`, SMS code `000000`, test bank routing `110000000` / account `000123456789`, SSN `000-00-0000`, address line `address_full_match`).
3. Return to the app → status turns "Ready" (`card_payments` active).
4. Open an unpaid invoice → **Add card payment link** → Send PDF. Open the "Pay online" link → Stripe Checkout → pay with `4242 4242 4242 4242`, any future date, any CVC.
5. Back in the app → **Check payment** → invoice is marked paid with a "Card (Stripe)" payment. In the connected account's dashboard the PaymentIntent shows `invoicejot_status=paid` (from the webhook) and the platform balance shows the 1% application fee.
6. Local webhook testing: `stripe listen --forward-connect-to localhost:3000/api/connect/webhook` and use the printed `whsec_…`.

Curl smoke test (test keys):

```bash
curl -s -X POST https://invoicejot.com/api/connect/accounts -H 'Content-Type: application/json' -d '{"country":"us","currency":"usd"}'
# -> {"accountId":"acct_…","accountKey":"…","onboardingUrl":"https://connect.stripe.com/…"}
```

## Known limits / follow-ups

* Anyone can call `POST /api/connect/accounts` (there is no login). Add a Vercel Firewall rate limit on `/api/connect/*` (e.g. 20 req/min/IP) before launch.
* Payment-status lookup scans PaymentIntents created since the link was issued (up to 1,000). Fine for small businesses; very high-volume accounts would need the Search API or a small table.
* "Disconnect" only forgets the account on the phone. With `dashboard: "full"` the Stripe account is the user's; they close it in Stripe. The platform cannot delete it.
* Currencies: two-decimal and zero-decimal; three-decimal currencies (KWD, BHD, …) are refused.
* Countries offered in the app: US, CA, GB, AU, NZ, IE (`SUPPORTED_COUNTRIES` in `lib/connect/service.ts`). Euro-area countries other than Ireland can be added there and in `CARD_COUNTRIES`.
