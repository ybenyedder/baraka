import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  zApproveMerchant,
  zModerateReview,
  zResolveReport,
  zUpsertCampaign,
  zAdminStats,
  MERCHANT_STATUSES,
} from '@baraka/shared';
import {
  listMerchants,
  approveMerchant,
  listUsers,
  listStores,
  listOrders,
  moderateReview,
  listReports,
  resolveReport,
  listCampaigns,
  upsertCampaign,
  getAdminStats,
} from './service';

export function adminRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const guard = { preHandler: [app.requireAdmin] };

  // Tableau de bord.
  r.route({
    method: 'GET',
    url: '/v1/admin/stats',
    ...guard,
    schema: { tags: ['admin'], response: { 200: zAdminStats } },
    handler: async () => getAdminStats(),
  });

  // File d'approbation commerçants.
  r.route({
    method: 'GET',
    url: '/v1/admin/merchants',
    ...guard,
    schema: {
      tags: ['admin'],
      querystring: z.object({ status: z.enum(MERCHANT_STATUSES).optional() }),
    },
    handler: async (req) => ({ items: await listMerchants(req.query.status) }),
  });

  r.route({
    method: 'POST',
    url: '/v1/admin/merchants/:merchantId/decision',
    ...guard,
    schema: {
      tags: ['admin'],
      params: z.object({ merchantId: z.string().uuid() }),
      body: zApproveMerchant,
    },
    handler: async (req) => approveMerchant(req.user!.id, req.params.merchantId, req.body),
  });

  // Listes.
  r.route({
    method: 'GET',
    url: '/v1/admin/users',
    ...guard,
    schema: { tags: ['admin'] },
    handler: async () => ({ items: await listUsers() }),
  });
  r.route({
    method: 'GET',
    url: '/v1/admin/stores',
    ...guard,
    schema: { tags: ['admin'] },
    handler: async () => ({ items: await listStores() }),
  });
  r.route({
    method: 'GET',
    url: '/v1/admin/orders',
    ...guard,
    schema: { tags: ['admin'] },
    handler: async () => ({ items: await listOrders() }),
  });

  // Modération.
  r.route({
    method: 'POST',
    url: '/v1/admin/reviews/:reviewId/moderate',
    ...guard,
    schema: {
      tags: ['admin'],
      params: z.object({ reviewId: z.string().uuid() }),
      body: zModerateReview,
    },
    handler: async (req) => {
      await moderateReview(req.params.reviewId, req.body);
      return { ok: true };
    },
  });
  r.route({
    method: 'GET',
    url: '/v1/admin/reports',
    ...guard,
    schema: { tags: ['admin'] },
    handler: async () => ({ items: await listReports() }),
  });
  r.route({
    method: 'POST',
    url: '/v1/admin/reports/:reportId/resolve',
    ...guard,
    schema: {
      tags: ['admin'],
      params: z.object({ reportId: z.string().uuid() }),
      body: zResolveReport,
    },
    handler: async (req) => {
      await resolveReport(req.user!.id, req.params.reportId, req.body);
      return { ok: true };
    },
  });

  // Campagnes.
  r.route({
    method: 'GET',
    url: '/v1/admin/campaigns',
    ...guard,
    schema: { tags: ['admin'] },
    handler: async () => ({ items: await listCampaigns() }),
  });
  r.route({
    method: 'POST',
    url: '/v1/admin/campaigns',
    ...guard,
    schema: { tags: ['admin'], body: zUpsertCampaign },
    handler: async (req) => upsertCampaign(req.body),
  });
  r.route({
    method: 'PUT',
    url: '/v1/admin/campaigns/:campaignId',
    ...guard,
    schema: {
      tags: ['admin'],
      params: z.object({ campaignId: z.string().uuid() }),
      body: zUpsertCampaign,
    },
    handler: async (req) => upsertCampaign(req.body, req.params.campaignId),
  });
}
