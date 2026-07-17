import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { users } from '@baraka/db';
import { verifyToken, SESSION_COOKIE } from '../lib/auth-tokens';
import { getDb } from '../lib/db';
import { errors } from '../lib/errors';
import type { UserRole, Locale } from '@baraka/shared';

export interface AuthUser {
  id: string;
  role: UserRole;
  locale: Locale;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
  interface FastifyInstance {
    /** preHandler : exige un utilisateur authentifié (sinon 401). */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler : exige un rôle admin. */
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function readToken(req: FastifyRequest): string | null {
  // Bearer prioritaire (mobile / API) ; à défaut, cookie de session HttpOnly (web).
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[SESSION_COOKIE] ?? null;
}

export function registerAuth(app: FastifyInstance): void {
  app.decorateRequest('user', null);

  // Résout l'utilisateur pour chaque requête (best-effort, n'échoue pas).
  app.addHook('onRequest', async (req) => {
    const token = readToken(req);
    if (!token) return;
    const claims = await verifyToken(token);
    if (!claims) return;
    // Un compte supprimé (soft-delete) ne doit plus être authentifié malgré un token valide.
    // Le rôle et la locale sont lus EN BASE (et non depuis le claim JWT, valable 7 j) : une
    // rétrogradation (admin retiré, commerçant suspendu) prend effet immédiatement (M3).
    const account = await getDb().query.users.findFirst({
      where: eq(users.id, claims.sub),
      columns: { id: true, deletedAt: true, role: true, locale: true },
    });
    if (!account || account.deletedAt) return;
    req.user = { id: claims.sub, role: account.role, locale: account.locale };
  });

  app.decorate('authenticate', async (req: FastifyRequest) => {
    if (!req.user) throw errors.unauthorized();
  });

  app.decorate('requireAdmin', async (req: FastifyRequest) => {
    if (!req.user) throw errors.unauthorized();
    if (req.user.role !== 'admin') throw errors.forbidden('Réservé aux administrateurs.');
  });
}
