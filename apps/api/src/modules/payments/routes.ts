import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { enabledPaymentMethods } from './registry';
import { handleKonnectWebhook, handleStripeWebhook } from './service';

export function paymentRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Moyens de paiement actifs (l'app adapte le checkout).
  r.route({
    method: 'GET',
    url: '/v1/payments/methods',
    schema: { tags: ['payments'], response: { 200: z.object({ methods: z.array(z.string()) }) } },
    handler: async () => ({ methods: enabledPaymentMethods() }),
  });

  // Webhook Konnect : GET (comportement natif) et POST par sécurité.
  const konnectHandler = async (req: { query: { payment_ref?: string } }) => {
    const ref = req.query.payment_ref;
    if (!ref) return { ok: false };
    await handleKonnectWebhook(ref);
    return { ok: true };
  };

  r.route({
    method: ['GET', 'POST'],
    url: '/v1/payments/webhooks/konnect',
    schema: { tags: ['payments'], querystring: z.object({ payment_ref: z.string().optional() }) },
    handler: konnectHandler,
  });

  // Webhook Stripe : nécessite le corps BRUT (vérification de signature). On encapsule
  // un parser « buffer » dans un scope dédié pour ne pas affecter les autres routes.
  void app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });
    scope.post('/v1/payments/webhooks/stripe', async (req, reply) => {
      const raw = req.body as Buffer;
      await handleStripeWebhook(raw, {
        'stripe-signature': req.headers['stripe-signature'] as string | undefined,
      });
      reply.send({ ok: true });
    });
  });
}
