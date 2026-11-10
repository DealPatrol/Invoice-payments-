import { requireUser } from '@/lib/require-user';

export const dynamic = 'force-dynamic';

export default async function GatedLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/price-book');
  return children;
}
