import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { zRegisterInput, zLoginInput, zRegisterDeviceInput, zSessionUser } from '@baraka/shared';
import { register, login, getMe, deleteAccount, registerDevice, unregisterDevice } from './service';
import { SESSION_COOKIE, sessionCookieOptions } from '../../lib/auth-tokens';

const zAuthResponse = z.object({ token: z.string(), user: zSessionUser });

export function authRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Limites serrées anti brute-force / credential-stuffing sur l'authentification.
  const authLimit = { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } };

  r.route({
    method: 'POST',
    url: '/v1/auth/register',
    ...authLimit,
    schema: { tags: ['auth'], body: zRegisterInput, response: { 200: zAuthResponse } },
    handler: async (req, reply) => {
      const result = await register(req.body);
      // Cookie HttpOnly pour le web ; le token JSON reste pour le mobile (Bearer).
      reply.setCookie(SESSION_COOKIE, result.token, sessionCookieOptions());
      return result;
    },
  });

  r.route({
    method: 'POST',
    url: '/v1/auth/login',
    ...authLimit,
    schema: { tags: ['auth'], body: zLoginInput, response: { 200: zAuthResponse } },
    handler: async (req, reply) => {
      const result = await login(req.body);
      reply.setCookie(SESSION_COOKIE, result.token, sessionCookieOptions());
      return result;
    },
  });

  // Déconnexion web : efface le cookie de session (le mobile se contente d'oublier son Bearer).
  r.route({
    method: 'POST',
    url: '/v1/auth/logout',
    schema: { tags: ['auth'], response: { 200: z.object({ ok: z.boolean() }) } },
    handler: async (_req, reply) => {
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      return { ok: true };
    },
  });

  r.route({
    method: 'GET',
    url: '/v1/auth/me',
    preHandler: [app.authenticate],
    schema: { tags: ['auth'], response: { 200: zSessionUser } },
    handler: async (req) => getMe(req.user!.id),
  });

  r.route({
    method: 'DELETE',
    url: '/v1/users/me',
    preHandler: [app.authenticate],
    schema: { tags: ['auth'], response: { 200: z.object({ deleted: z.boolean() }) } },
    handler: async (req) => {
      await deleteAccount(req.user!.id);
      return { deleted: true };
    },
  });

  r.route({
    method: 'POST',
    url: '/v1/devices',
    preHandler: [app.authenticate],
    schema: {
      tags: ['devices'],
      body: zRegisterDeviceInput,
      response: { 200: z.object({ ok: z.boolean() }) },
    },
    handler: async (req) => {
      await registerDevice(req.user!.id, req.body);
      return { ok: true };
    },
  });

  // Désenregistrement du device push à la déconnexion (évite que le porteur suivant de
  // l'appareil reçoive les notifications de l'ancien compte).
  r.route({
    method: 'DELETE',
    url: '/v1/devices',
    preHandler: [app.authenticate],
    schema: {
      tags: ['devices'],
      body: z.object({ expoPushToken: z.string().min(1) }),
      response: { 200: z.object({ ok: z.boolean() }) },
    },
    handler: async (req) => {
      await unregisterDevice(req.user!.id, req.body.expoPushToken);
      return { ok: true };
    },
  });
}
