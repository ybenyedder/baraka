import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { orders, users } from '@baraka/db';
import { zCreateOrderInput, zCancelOrderInput } from '@baraka/shared';
import { getDb } from '../../lib/db';
import { errors } from '../../lib/errors';
import { initSse, sse } from '../../lib/sse';
import { createOrder, cancelOrder, confirmPickup, listUserOrders, getUserOrder } from './service';

const zIdParam = z.object({ id: z.string().uuid() });

export function orderRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Créer une réservation.
  r.route({
    method: 'POST',
    url: '/v1/orders',
    preHandler: [app.authenticate],
    schema: { tags: ['orders'], body: zCreateOrderInput },
    handler: async (req) => {
      const dbUser = await getDb().query.users.findFirst({ where: eq(users.id, req.user!.id) });
      if (!dbUser) throw errors.unauthorized();
      const { order, payment } = await createOrder(
        { id: dbUser.id, email: dbUser.email, name: dbUser.name, phone: dbUser.phone },
        req.body,
        Date.now(),
      );
      return {
        id: order.id,
        number: order.number,
        status: order.status,
        paymentMethod: order.paymentMethod,
        quantity: order.quantity,
        total: { amountMinor: order.totalMinor, currency: order.currency },
        creditApplied: { amountMinor: order.creditAppliedMinor, currency: order.currency },
        pickupCode: order.pickupCode,
        payment,
      };
    },
  });

  // Historique des commandes du client.
  r.route({
    method: 'GET',
    url: '/v1/orders',
    preHandler: [app.authenticate],
    handler: async (req) => {
      const items = await listUserOrders(req.user!.id);
      return { items };
    },
  });

  // Détail d'une commande.
  r.route({
    method: 'GET',
    url: '/v1/orders/:id',
    preHandler: [app.authenticate],
    schema: { tags: ['orders'], params: zIdParam },
    handler: async (req) => {
      const order = await getUserOrder(req.user!.id, req.params.id);
      if (!order) throw errors.notFound('Commande introuvable.');
      return order;
    },
  });

  // Annuler.
  r.route({
    method: 'POST',
    url: '/v1/orders/:id/cancel',
    preHandler: [app.authenticate],
    schema: { tags: ['orders'], params: zIdParam, body: zCancelOrderInput },
    handler: async (req) => cancelOrder(req.user!.id, req.params.id, req.body.reason, Date.now()),
  });

  // Self-swipe « j'ai récupéré mon panier ».
  r.route({
    method: 'POST',
    url: '/v1/orders/:id/confirm-pickup',
    preHandler: [app.authenticate],
    schema: { tags: ['orders'], params: zIdParam },
    handler: async (req) => {
      const order = await getDb().query.orders.findFirst({
        where: and(eq(orders.id, req.params.id), eq(orders.userId, req.user!.id)),
      });
      if (!order) throw errors.notFound('Commande introuvable.');
      // Le cash doit être validé par le commerçant (code) : pas d'auto-complétion client
      // (sinon impact/CO₂ et crédit de parrainage sans encaissement réel).
      if (order.paymentMethod === 'cash') {
        throw errors.badRequest(
          'Le retrait d’une commande en espèces est validé par le commerçant via le code de retrait.',
        );
      }
      return confirmPickup(order.id, Date.now());
    },
  });

  // Flux SSE du statut de commande.
  r.route({
    method: 'GET',
    url: '/v1/orders/:id/events',
    preHandler: [app.authenticate],
    schema: { tags: ['orders'], params: zIdParam },
    handler: async (req, reply) => {
      // Propriété obligatoire : sinon tout authentifié écouterait le flux d'autrui (IDOR).
      const own = await getDb().query.orders.findFirst({
        where: and(eq(orders.id, req.params.id), eq(orders.userId, req.user!.id)),
        columns: { id: true },
      });
      if (!own) throw errors.notFound('Commande introuvable.');
      reply.hijack();
      initSse(reply);
      sse.subscribe(`order:${req.params.id}`, reply);
    },
  });
}
