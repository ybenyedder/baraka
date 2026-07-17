import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { zStoreDetail, zUpsertStore } from '@baraka/shared';
import {
  getStoreDetail,
  createStore,
  updateStore,
  setStoreStatus,
  listMyStores,
  setStoreImage,
} from './service';
import { errors } from '../../lib/errors';

const zStoreIdParam = z.object({ storeId: z.string().uuid() });

export function storeRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Public : détail d'une boutique par slug (page SSR + écran mobile).
  r.route({
    method: 'GET',
    url: '/v1/discovery/stores/:slug',
    schema: {
      tags: ['discovery'],
      params: z.object({ slug: z.string() }),
      response: { 200: zStoreDetail },
    },
    handler: async (req) => getStoreDetail(req.params.slug),
  });

  // Commerçant : mes boutiques.
  r.route({
    method: 'GET',
    url: '/v1/merchant/stores',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'] },
    handler: async (req) => ({ items: await listMyStores(req.user!.id) }),
  });

  r.route({
    method: 'POST',
    url: '/v1/merchant/stores',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], body: zUpsertStore },
    handler: async (req) => createStore(req.user!.id, req.body),
  });

  r.route({
    method: 'PUT',
    url: '/v1/merchant/stores/:storeId',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], params: zStoreIdParam, body: zUpsertStore },
    handler: async (req) => {
      await updateStore(req.user!.id, req.params.storeId, req.body);
      return { ok: true };
    },
  });

  r.route({
    method: 'POST',
    url: '/v1/merchant/stores/:storeId/status',
    preHandler: [app.authenticate],
    schema: {
      tags: ['merchant'],
      params: zStoreIdParam,
      body: z.object({ status: z.enum(['active', 'paused']) }),
    },
    handler: async (req) => {
      await setStoreStatus(req.user!.id, req.params.storeId, req.body.status);
      return { ok: true };
    },
  });

  // Upload image (multipart) : ?type=cover|logo
  app.post<{ Params: { storeId: string } }>(
    '/v1/merchant/stores/:storeId/image',
    { preHandler: [app.authenticate], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req) => {
      const file = await req.file();
      if (!file) throw errors.badRequest('Fichier image manquant.');
      const which = (req.query as { type?: string }).type === 'logo' ? 'logo' : 'cover';
      const buffer = await file.toBuffer();
      return setStoreImage(req.user!.id, req.params.storeId, buffer, which);
    },
  );
}
