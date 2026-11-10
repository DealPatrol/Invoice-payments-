import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';

export const metadata: Metadata = { title: 'Welcome | Invoice Laboratory', robots: { index: false } };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const planName = plan === 'pro' ? 'Pro' : plan === 'solo' ? 'Solo' : 'your plan';
  return (
    <SiteShell>
      <main className="panel">
        <div className="eyebrow">You&apos;re in</div>
        <h2 style={{ fontSize: 40, margin: '8px 0 12px' }}>Welcome to Invoice Laboratory {planName}.</h2>
        <p className="muted">Stripe has your subscription and will email your receipt. Three quick steps and you&apos;re ready for your next job:</p>
        <ol className="steps">
          <li><b>Create your account</b> with the same email you used at checkout.</li>
          <li><b>Set your five numbers</b>: labor rate, trip fee, markup, minimum job and tax rate.</li>
          <li><b>Add your price book</b>, then snap your first job.</li>
        </ol>
        <div className="cta-row">
          <Link className="btn" href="/login?signup=1">Create my account</Link>
          <Link className="btn ghost" href="/login">I already have one</Link>
        </div>
        <p className="fine">You can manage or cancel your subscription from the link in your Stripe receipt.</p>
      </main>
    </SiteShell>
  );
}
