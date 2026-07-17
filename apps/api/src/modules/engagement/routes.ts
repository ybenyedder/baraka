import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { zCreateReview, zUserImpact } from '@baraka/shared';
import {
  createReview,
  listStoreReviews,
  addFavorite,
  removeFavorite,
  listFavorites,
  getMyReferral,
  getUserImpact,
  getActiveCampaigns,
} from './service';

const zStoreIdParam = z.object({ storeId: z.string().uuid() });

export function engagementRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Avis.
  r.route({
    method: 'POST',
    url: '/v1/orders/:id/review',
    preHandler: [app.authenticate],
    schema: { tags: ['reviews'], params: z.object({ id: z.string().uuid() }), body: zCreateReview },
    handler: async (req) => createReview(req.user!.id, req.params.id, req.body),
  });

  r.route({
    method: 'GET',
    url: '/v1/discovery/stores/:slug/reviews',
    schema: { tags: ['reviews'], params: z.object({ slug: z.string() }) },
    handler: async (req) => ({ items: await listStoreReviews(req.params.slug) }),
  });

  // Favoris.
  r.route({
    method: 'GET',
    url: '/v1/favorites',
    preHandler: [app.authenticate],
    schema: { tags: ['favorites'] },
    handler: async (req) => ({ items: await listFavorites(req.user!.id) }),
  });
  r.route({
    method: 'POST',
    url: '/v1/favorites/:storeId',
    preHandler: [app.authenticate],
    schema: { tags: ['favorites'], params: zStoreIdParam },
    handler: async (req) => {
      await addFavorite(req.user!.id, req.params.storeId);
      return { ok: true };
    },
  });
  r.route({
    method: 'DELETE',
    url: '/v1/favorites/:storeId',
    preHandler: [app.authenticate],
    schema: { tags: ['favorites'], params: zStoreIdParam },
    handler: async (req) => {
      await removeFavorite(req.user!.id, req.params.storeId);
      return { ok: true };
    },
  });

  // Parrainage.
  r.route({
    method: 'GET',
    url: '/v1/referrals',
    preHandler: [app.authenticate],
    schema: { tags: ['referrals'] },
    handler: async (req) => getMyReferral(req.user!.id),
  });

  // Impact.
  r.route({
    method: 'GET',
    url: '/v1/impact',
    preHandler: [app.authenticate],
    schema: { tags: ['impact'], response: { 200: zUserImpact } },
    handler: async (req) => getUserImpact(req.user!.id),
  });

  // Campagnes publiques (home).
  r.route({
    method: 'GET',
    url: '/v1/discovery/campaigns',
    schema: { tags: ['discovery'], querystring: z.object({ locale: z.string().optional() }) },
    handler: async (req) => ({ items: await getActiveCampaigns(req.query.locale) }),
  });
}
