import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  generatePayoutDrafts,
  listMyPayouts,
  listAllPayouts,
  approvePayout,
  markPayoutPaid,
} from './service';

export function payoutRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Commerçant : mes versements.
  r.route({
    method: 'GET',
    url: '/v1/merchant/payouts',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'] },
    handler: async (req) => ({ items: await listMyPayouts(req.user!.id) }),
  });

  // Admin : génération, liste, approbation, paiement.
  r.route({
    method: 'POST',
    url: '/v1/admin/payouts/generate',
    preHandler: [app.requireAdmin],
    schema: {
      tags: ['admin'],
      body: z.object({ periodStart: z.string(), periodEnd: z.string() }),
    },
    handler: async (req) => ({
      created: await generatePayoutDrafts(req.body.periodStart, req.body.periodEnd),
    }),
  });

  r.route({
    method: 'GET',
    url: '/v1/admin/payouts',
    preHandler: [app.requireAdmin],
    schema: { tags: ['admin'] },
    handler: async () => ({ items: await listAllPayouts() }),
  });

  r.route({
    method: 'POST',
    url: '/v1/admin/payouts/:id/approve',
    preHandler: [app.requireAdmin],
    schema: { tags: ['admin'], params: z.object({ id: z.string().uuid() }) },
    handler: async (req) => {
      await approvePayout(req.params.id);
      return { ok: true };
    },
  });

  r.route({
    method: 'POST',
    url: '/v1/admin/payouts/:id/pay',
    preHandler: [app.requireAdmin],
    schema: {
      tags: ['admin'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ bankReference: z.string().min(1) }),
    },
    handler: async (req) => {
      await markPayoutPaid(req.params.id, req.body.bankReference);
      return { ok: true };
    },
  });
}
