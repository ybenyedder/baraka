import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  zValidatePickupInput,
  zApplyMerchant,
  zMerchantStats,
  zUpdateMerchantProfile,
  zMerchantOrder,
  zMerchantOrdersQuery,
  zMerchantAnalytics,
} from '@baraka/shared';
import { validatePickupByCode } from '../orders/service';
import {
  applyAsMerchant,
  getMyMerchant,
  updateMyMerchant,
  getMerchantStats,
  getMerchantAnalytics,
  listMerchantOrders,
} from './service';
import { assertStoreOwnership } from './guard';
import { initSse, sse } from '../../lib/sse';

export function merchantRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Candidature commerçant (crée un merchant pending).
  r.route({
    method: 'POST',
    url: '/v1/merchant/apply',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], body: zApplyMerchant },
    handler: async (req) => applyAsMerchant(req.user!.id, req.body),
  });

  // Mon compte commerçant.
  r.route({
    method: 'GET',
    url: '/v1/merchant/me',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'] },
    handler: async (req) => getMyMerchant(req.user!.id),
  });

  // Mise à jour du profil commerçant (contact, matricule fiscal, RIB).
  r.route({
    method: 'PUT',
    url: '/v1/merchant/me',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], body: zUpdateMerchantProfile },
    handler: async (req) => updateMyMerchant(req.user!.id, req.body),
  });

  // Statistiques agrégées.
  r.route({
    method: 'GET',
    url: '/v1/merchant/stats',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], response: { 200: zMerchantStats } },
    handler: async (req) => getMerchantStats(req.user!.id),
  });

  // Analytics : série quotidienne + répartition par boutique.
  r.route({
    method: 'GET',
    url: '/v1/merchant/analytics',
    preHandler: [app.authenticate],
    schema: {
      tags: ['merchant'],
      querystring: z.object({ days: z.coerce.number().int().min(7).max(365).default(30) }),
      response: { 200: zMerchantAnalytics },
    },
    handler: async (req) => getMerchantAnalytics(req.user!.id, req.query.days),
  });

  // Commandes des boutiques du commerçant (retraits du jour ou historique).
  r.route({
    method: 'GET',
    url: '/v1/merchant/orders',
    preHandler: [app.authenticate],
    schema: {
      tags: ['merchant'],
      querystring: zMerchantOrdersQuery,
      response: { 200: z.object({ items: z.array(zMerchantOrder) }) },
    },
    handler: async (req) => ({ items: await listMerchantOrders(req.user!.id, req.query) }),
  });

  // Valider un retrait par saisie du code à 6 chiffres.
  r.route({
    method: 'POST',
    url: '/v1/merchant/orders/validate',
    preHandler: [app.authenticate],
    // Limite le brute-force du code de retrait à 6 chiffres.
    config: { rateLimit: { max: 12, timeWindow: '1 minute' } },
    schema: {
      tags: ['merchant'],
      body: zValidatePickupInput,
      response: { 200: z.object({ status: z.string() }) },
    },
    handler: async (req) => validatePickupByCode(req.user!.id, req.body.pickupCode, Date.now()),
  });

  // Flux SSE des commandes entrantes d'une boutique.
  r.route({
    method: 'GET',
    url: '/v1/merchant/stores/:storeId/orders/stream',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], params: z.object({ storeId: z.string().uuid() }) },
    handler: async (req, reply) => {
      // La boutique doit appartenir au commerçant (sinon IDOR sur le flux temps réel).
      await assertStoreOwnership(req.user!.id, req.params.storeId);
      reply.hijack();
      initSse(reply);
      sse.subscribe(`store:${req.params.storeId}`, reply);
    },
  });
}
