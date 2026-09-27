import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';
import { isDemoMode } from './config';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export async function getTenantId(): Promise<string> {
  if (isDemoMode()) return 'demo-user';

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user.id;
}
