import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { listNotifications, unreadCount, markRead, markAllRead } from './service';

export function notificationRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.route({
    method: 'GET',
    url: '/v1/notifications',
    preHandler: [app.authenticate],
    schema: { tags: ['notifications'] },
    handler: async (req) => ({
      items: await listNotifications(req.user!.id),
      unread: await unreadCount(req.user!.id),
    }),
  });

  r.route({
    method: 'POST',
    url: '/v1/notifications/:id/read',
    preHandler: [app.authenticate],
    schema: { tags: ['notifications'], params: z.object({ id: z.string().uuid() }) },
    handler: async (req) => {
      await markRead(req.user!.id, req.params.id);
      return { ok: true };
    },
  });

  r.route({
    method: 'POST',
    url: '/v1/notifications/read-all',
    preHandler: [app.authenticate],
    schema: { tags: ['notifications'] },
    handler: async (req) => {
      await markAllRead(req.user!.id);
      return { ok: true };
    },
  });
}
