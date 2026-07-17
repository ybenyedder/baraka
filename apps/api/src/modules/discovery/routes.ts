import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { zNearbyQuery, zNearbyResponse, zBagCard } from '@baraka/shared';
import { findNearby, getBagCard } from './service';
import { errors } from '../../lib/errors';

export function discoveryRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.route({
    method: 'GET',
    url: '/v1/discovery/stores/nearby',
    schema: {
      tags: ['discovery'],
      summary: 'Paniers « live » à proximité, triés par distance (PostGIS).',
      querystring: zNearbyQuery,
      response: { 200: zNearbyResponse },
    },
    handler: async (req) => findNearby(req.query),
  });

  // Détail autoritatif d'un panier (checkout : prix vérifié, non falsifiable via deep link).
  r.route({
    method: 'GET',
    url: '/v1/discovery/bags/:bagInstanceId',
    schema: {
      tags: ['discovery'],
      params: z.object({ bagInstanceId: z.string().uuid() }),
      response: { 200: zBagCard },
    },
    handler: async (req) => {
      const bag = await getBagCard(req.params.bagInstanceId);
      if (!bag) throw errors.notFound('Panier introuvable ou indisponible.');
      return bag;
    },
  });
}
