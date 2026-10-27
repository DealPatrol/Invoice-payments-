'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { COLORS } from '@/lib/constants';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Register
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Registration failed');
        }

        // Sign in after registration
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        router.push('/');
      } else {
        // Login
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(1200px 600px at 50% -10%, var(--accent-soft), transparent 60%), var(--background)' }}
    >
      <div
        className="animate-in w-full max-w-md space-y-6 rounded-[var(--radius-lg)] border p-8 shadow-[var(--shadow-lg)] sm:p-10"
        style={{
          background: COLORS.surface,
          borderColor: COLORS.border,
        }}
      >
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div
              className="p-2 rounded-lg"
              style={{ background: COLORS.accentGlow }}
            >
              <LogIn size={24} style={{ color: COLORS.accent }} />
            </div>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              color: COLORS.text,
            }}
          >
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            {isSignUp
              ? 'Join InvoiceOS to manage your invoices'
              : 'Sign in to your InvoiceOS account'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label
                className="mb-1.5 block text-[13px] font-medium"
                style={{ color: COLORS.textMuted }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
              style={{
                background: COLORS.surfaceHigh,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label
              className="mb-1.5 block text-[13px] font-medium"
              style={{ color: COLORS.textMuted }}
            >
              Email Address
            </label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-[10px] border transition focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent-soft)]"
              style={{
                background: COLORS.surface,
                borderColor: COLORS.border,
              }}
            >
              <Mail size={18} style={{ color: COLORS.accent }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: COLORS.text }}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-[13px] font-medium"
              style={{ color: COLORS.textMuted }}
            >
              Password
            </label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-[10px] border transition focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent-soft)]"
              style={{
                background: COLORS.surface,
                borderColor: COLORS.border,
              }}
            >
              <Lock size={18} style={{ color: COLORS.accent }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: COLORS.text }}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                background: 'var(--danger-soft)',
                color: COLORS.danger,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
            style={{
              background: COLORS.accent,
              color: 'var(--on-accent)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {loading
              ? 'Processing...'
              : isSignUp
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        {/* Toggle Sign Up / Login */}
        <div className="text-center text-sm" style={{ color: COLORS.textMuted }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="font-bold transition-colors hover:underline"
            style={{ color: COLORS.accent }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
