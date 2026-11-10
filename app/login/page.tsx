import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in | Invoice Laboratory' };

function safeCallback(raw: string | undefined): string {
  // Only allow same-site relative paths to avoid open redirects.
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/dashboard';
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ signup?: string; callbackUrl?: string }> }) {
  const sp = await searchParams;
  return <LoginForm initialSignUp={sp.signup === '1'} callbackUrl={safeCallback(sp.callbackUrl)} />;
}
