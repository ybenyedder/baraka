import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Ignore /api, l'API proxifiée (/v1, /u, /healthz), les internes Next et les fichiers statiques.
  matcher: ['/((?!api|v1|u|healthz|_next|_vercel|.*\\..*).*)'],
};
