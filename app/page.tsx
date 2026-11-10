import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { PricingCards } from '@/components/marketing/PricingCards';
import { foundingPilotLink } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Invoice Laboratory | Photo estimates priced from your own book',
  description:
    'Snap the job, talk or type what it needs, and send an itemized estimate priced from your own price book. One tap to invoice. Built in Gadsden for Alabama trades.',
};

const LAYOUTS = [
  ['01-classic-ledger', 'Classic Ledger'],
  ['02-modern-minimal', 'Modern Minimal'],
  ['03-bold-trade-header', 'Bold Trade Header'],
  ['04-photo-forward-estimate', 'Photo-Forward Estimate'],
  ['05-good-better-best', 'Good · Better · Best'],
  ['06-compact-receipt', 'Compact Receipt'],
  ['07-itemized-materials-labor', 'Materials + Labor'],
  ['08-change-order', 'Change Order'],
] as const;

export default function HomePage() {
  return (
    <SiteShell>
      <main className="wrap">
        <div className="hero">
          <div>
            <div className="eyebrow">For HVAC, plumbing, electrical, handyman &amp; landscaping pros</div>
            <h1>Snap it. Say it. Send it, priced from <em>your</em> book.</h1>
            <p className="lead">Invoice Laboratory turns job photos and a few notes into an itemized estimate built on your own prices. Your client approves it on their phone, and it becomes an invoice in one tap.</p>
            <div className="cta-row">
              <Link className="btn" href="/login?signup=1">Start free: 3 photo estimates a month</Link>
              <Link className="btn ghost" href="/pricing">See plans</Link>
            </div>
            <p className="fine">No card for the 14-day Pro trial. Cancel anytime.</p>
          </div>
          <div className="card" aria-label="Example estimate">
            <div className="est-head"><b>Estimate EST-0142</b><span className="muted">Condenser fan motor</span></div>
            <div className="line"><span>Diagnostic / service call <span className="badge b-book">YOUR BOOK</span></span><span>1 visit</span></div>
            <div className="line"><span>Condenser fan motor, 1/4 HP <span className="badge b-book">YOUR BOOK</span></span><span>1 ea</span></div>
            <div className="line"><span>Run capacitor 5 µF <span className="badge b-book">YOUR BOOK</span></span><span>1 ea</span></div>
            <div className="line"><span>Labor <span className="badge b-def">YOUR RATE</span></span><span>1.5 hr</span></div>
            <div className="line"><span>Fan blade (if bent) <span className="badge b-need">NEEDS YOUR PRICE</span></span><span>1 ea</span></div>
            <p className="fine" style={{ marginTop: 14 }}>Sample layout only, not a real customer. Invoice Laboratory fills in the lines and quantities; prices come from your price book and settings. Anything it can&apos;t match is flagged for you, never guessed.</p>
          </div>
        </div>

        <section>
          <div className="eyebrow">The problem</div>
          <h2>Estimating eats your evenings.</h2>
          <div className="grid2 problem">
            <ul className="plain">
              <li>You write the quote at the kitchen table after a 10-hour day, and the client has already called someone else.</li>
              <li>Generic invoice apps make you type every line, every time.</li>
            </ul>
            <ul className="plain">
              <li>&quot;Market price&quot; guesses can come in under what the work really costs in your town, and you eat the difference.</li>
              <li>Clients change their minds. You need change orders, not a fresh start.</li>
            </ul>
          </div>
        </section>

        <section id="how">
          <div className="eyebrow">How it works</div>
          <h2>Three steps, one visit.</h2>
          <div className="grid3">
            <div className="step"><div className="num">1</div><h3>Snap &amp; say</h3><p>Take a few photos and describe the job: &quot;Fan motor&apos;s seized, cap&apos;s swollen.&quot; Type it or use your phone&apos;s dictation.</p></div>
            <div className="step"><div className="num">2</div><h3>Review the draft</h3><p>You get grouped line items with quantities and labor hours, priced from your book. Anything it can&apos;t price is flagged for you.</p></div>
            <div className="step"><div className="num">3</div><h3>Send, approve, invoice</h3><p>Text the link. Your client approves on their phone, and one tap turns the approved estimate into the invoice.</p></div>
          </div>
        </section>

        <section id="features">
          <div className="eyebrow">Features</div>
          <h2>Everything a one-truck shop needs. Nothing it doesn&apos;t.</h2>
          <div className="grid3">
            <div className="feature"><h3>Your price book, front and center</h3><p>Add your parts and services once with your prices. Estimates pull from it, and lines it can&apos;t match show &quot;needs your price&quot;.</p></div>
            <div className="feature"><h3>Five-number setup</h3><p>Labor rate, trip fee, markup, minimum job and tax rate. That&apos;s the whole onboarding.</p></div>
            <div className="feature"><h3>Good / Better / Best</h3><p>Offer three options in one estimate. The client picks, and the total follows their choice.</p></div>
            <div className="feature"><h3>Never lose a draft</h3><p>Invoice Studio saves as you type on your device, then syncs to your account when you&apos;re signed in.</p></div>
            <div className="feature"><h3>Change orders</h3><p>Client added a second bath fan? Make a change order on the approved estimate, then fold it in or invoice the difference.</p></div>
            <div className="feature"><h3>Get paid your way</h3><p>Put your own Stripe, Square or PayPal payment link on every invoice so the Pay button sends money straight to you.</p></div>
            <div className="feature"><h3>Jobs &amp; photos</h3><p>Keep each job&apos;s site, photos, estimates and invoices together in one place.</p></div>
            <div className="feature"><h3>Overdue tracking</h3><p>See what&apos;s unpaid and what&apos;s waiting on approval at a glance, and add late fees if you charge them.</p></div>
            <div className="feature"><h3>8 invoice layouts</h3><p>Classic Ledger, Modern Minimal, Bold Trade Header, Compact Receipt, Itemized, Editorial, Mono and Modern, all in your own accent color.</p></div>
          </div>
        </section>

        <section id="layouts">
          <div className="eyebrow">Invoice &amp; estimate layouts</div>
          <h2>Paperwork that looks like you charge what you&apos;re worth.</h2>
          <div className="layouts">
            {LAYOUTS.map(([file, name]) => (
              <figure key={file}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/layouts/${file}.webp`} alt={`${name} layout with sample data`} loading="lazy" width={480} height={621} />
                <figcaption>{name}</figcaption>
              </figure>
            ))}
          </div>
          <p className="fine">Design previews with sample data. Photos, Good/Better/Best options and change orders appear on the page your client approves; invoices print in any of the 8 layouts.</p>
        </section>

        <section id="pricing">
          <div className="eyebrow">Pricing</div>
          <h2>Fair, flat, and cheaper than the big names.</h2>
          <PricingCards />
          <p className="fine" style={{ marginTop: 18 }}>Invoice Laboratory takes no cut of your payments. Your payment provider&apos;s standard processing fees apply.</p>
        </section>

        <section id="faq">
          <div className="eyebrow">FAQ</div>
          <h2>Straight answers.</h2>
          <details><summary>Does the app decide my prices?</summary><p>No. The draft works out the lines, quantities and labor hours. Prices come from your price book and your settings. If an item isn&apos;t in your book, the line is marked &quot;needs your price&quot; instead of guessed.</p></details>
          <details><summary>How accurate is it?</summary><p>As accurate as your price book, plus a draft you always review before sending. We&apos;ll only publish accuracy numbers once we&apos;ve measured them on real jobs.</p></details>
          <details><summary>Which trades does it work for?</summary><p>Service-call and small-job work: HVAC, plumbing, electrical, handyman, landscaping, fencing, painting and small roofing repairs.</p></details>
          <details><summary>How do I get paid?</summary><p>Add your own payment link (Stripe, Square, PayPal and so on) in settings. It shows as a Pay button on your invoices, and the money goes to you, not to us. Built-in card payouts are on the roadmap.</p></details>
          <details><summary>Is there an iPhone app?</summary><p>Invoice Laboratory runs in your phone&apos;s browser today and can be added to your home screen. A native iOS app is next.</p></details>
          <details><summary>What happens after the Pro trial?</summary><p>Add a card to keep Pro, or do nothing and drop back to the Free plan. You&apos;re never locked out of your own estimates and invoices.</p></details>
          <details><summary>Can I cancel?</summary><p>Yes, anytime. Your plan stays active until the end of the period you paid for.</p></details>
        </section>

        <section className="closing" id="pilot">
          <div className="eyebrow">Built in Gadsden for Alabama trades</div>
          <h2>Price the job before you leave the driveway.</h2>
          <p className="muted">Founding pilot for the first 25 shops: Pro at $19/mo for your first 12 months.</p>
          <div className="cta-row" style={{ justifyContent: 'center' }}>
            <a className="btn" href={foundingPilotLink()} rel="noopener">Join the founding pilot</a>
            <Link className="btn ghost" href="/pricing">See plans</Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
