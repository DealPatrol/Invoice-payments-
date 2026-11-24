import { requireUser } from '@/lib/require-user';

export default async function IosLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/dashboard');
  return children;
}
