import type { SessionUser } from '@baraka/shared';

/** Route interne sûre pour la redirection post-login (`?next=`). */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

/** Destination par défaut selon le rôle. */
export function homeFor(user: SessionUser): string {
  if (user.role === 'admin') return '/admin';
  if (user.role === 'merchant' || user.isMerchant) return '/merchant';
  return '/browse';
}
