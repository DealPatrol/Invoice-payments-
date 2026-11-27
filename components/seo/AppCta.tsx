import Link from 'next/link';
import { appStoreUrl } from '@/lib/seo/site';

export function AppCta({ heading = 'Send it from your phone in a minute' }: { heading?: string }) {
  return (
    <section className="closing">
      <h2>{heading}</h2>
      <p className="lead" style={{ margin: '0 auto 22px' }}>
        Invoice Jot for iPhone: no account, works offline, PDF in one tap. Unlimited drafts and estimates free; your first 3 invoices are free to send.
      </p>
      <div className="cta-row" style={{ justifyContent: 'center' }}>
        <a className="btn web-only" href={appStoreUrl()}>
          Download on the App Store
        </a>
        <Link className="btn ghost" href="/free-invoice-generator">
          Use the free web generator
        </Link>
      </div>
    </section>
  );
}
