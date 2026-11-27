import Link from 'next/link';
import { appStoreUrl } from '@/lib/seo/site';
import './marketing.css';

export function SiteHeader() {
  return (
    <header className="top">
      <div className="wrap">
        <Link className="logo" href="/">
          Invoice <span>Jot</span>
        </Link>
        <nav className="links" aria-label="Site">
          <Link href="/free-invoice-generator">Free generator</Link>
          <Link href="/templates">Templates</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/support">Help</Link>
          <a className="signin web-only" href={appStoreUrl()}>
            Get the app
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap footer-grid">
        <div>
          <b>Invoice Jot</b>
          <p className="fine">Invoices, estimates and receipts for small businesses. No account; your data stays on your device. Nothing here is legal or tax advice.</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/free-invoice-generator">Free invoice generator</Link>
          <Link href="/templates">Invoice templates by trade</Link>
          <Link href="/compare">Compare invoice apps</Link>
          <Link href="/glossary">Invoicing glossary</Link>
        </nav>
        <nav aria-label="Company">
          <Link href="/support">Support</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Web app sign in</Link>
        </nav>
      </div>
      <div className="wrap fine">© {new Date().getFullYear()} Front Porch Growth · invoicejot.com</div>
    </footer>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="il-site">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
