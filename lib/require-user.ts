import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './authOptions';
import { isDemoMode } from './config';

/** Server-side gate for signed-in app pages. Demo mode stays open for previews. */
export async function requireUser(path: string): Promise<void> {
  if (isDemoMode()) return;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
}
