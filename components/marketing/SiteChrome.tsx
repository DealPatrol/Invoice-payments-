import Link from 'next/link';
import './marketing.css';

export function SiteHeader() {
  return (
    <header className="top">
      <div className="wrap">
        <Link className="logo" href="/">Invoice <span>Laboratory</span></Link>
        <nav className="links" aria-label="Site">
          <Link href="/#how">How it works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/#faq">FAQ</Link>
          <Link className="signin" href="/login">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        © {new Date().getFullYear()} Invoice Laboratory · Estimates are drafts you review before sending; nothing here is legal or tax advice. ·{' '}
        <Link href="/pricing">Pricing</Link> · <Link href="/login">Sign in</Link>
      </div>
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
