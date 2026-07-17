import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { zUpsertBagTemplate, zUpsertSchedule, zAdjustInstance } from '@baraka/shared';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  setTemplateImage,
  listSchedules,
  upsertSchedule,
  deleteSchedule,
  listTodayInstances,
  adjustInstance,
} from './service';
import { errors } from '../../lib/errors';

export function catalogRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Modèles de paniers d'une boutique.
  r.route({
    method: 'GET',
    url: '/v1/merchant/stores/:storeId/templates',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], params: z.object({ storeId: z.string().uuid() }) },
    handler: async (req) => ({ items: await listTemplates(req.user!.id, req.params.storeId) }),
  });

  r.route({
    method: 'POST',
    url: '/v1/merchant/stores/:storeId/templates',
    preHandler: [app.authenticate],
    schema: {
      tags: ['merchant'],
      params: z.object({ storeId: z.string().uuid() }),
      body: zUpsertBagTemplate,
    },
    handler: async (req) => createTemplate(req.user!.id, req.params.storeId, req.body),
  });

  r.route({
    method: 'PUT',
    url: '/v1/merchant/templates/:templateId',
    preHandler: [app.authenticate],
    schema: {
      tags: ['merchant'],
      params: z.object({ templateId: z.string().uuid() }),
      body: zUpsertBagTemplate,
    },
    handler: async (req) => {
      await updateTemplate(req.user!.id, req.params.templateId, req.body);
      return { ok: true };
    },
  });

  app.post<{ Params: { templateId: string } }>(
    '/v1/merchant/templates/:templateId/image',
    { preHandler: [app.authenticate], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req) => {
      const file = await req.file();
      if (!file) throw errors.badRequest('Fichier image manquant.');
      return setTemplateImage(req.user!.id, req.params.templateId, await file.toBuffer());
    },
  );

  // Plannings.
  r.route({
    method: 'GET',
    url: '/v1/merchant/templates/:templateId/schedules',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], params: z.object({ templateId: z.string().uuid() }) },
    handler: async (req) => ({ items: await listSchedules(req.user!.id, req.params.templateId) }),
  });

  r.route({
    method: 'PUT',
    url: '/v1/merchant/templates/:templateId/schedules',
    preHandler: [app.authenticate],
    schema: {
      tags: ['merchant'],
      params: z.object({ templateId: z.string().uuid() }),
      body: zUpsertSchedule,
    },
    handler: async (req) => {
      await upsertSchedule(req.user!.id, req.params.templateId, req.body);
      return { ok: true };
    },
  });

  r.route({
    method: 'DELETE',
    url: '/v1/merchant/schedules/:scheduleId',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], params: z.object({ scheduleId: z.string().uuid() }) },
    handler: async (req) => {
      await deleteSchedule(req.user!.id, req.params.scheduleId);
      return { ok: true };
    },
  });

  // Instances du jour + ajustement.
  r.route({
    method: 'GET',
    url: '/v1/merchant/stores/:storeId/instances/today',
    preHandler: [app.authenticate],
    schema: { tags: ['merchant'], params: z.object({ storeId: z.string().uuid() }) },
    handler: async (req) => ({ items: await listTodayInstances(req.user!.id, req.params.storeId) }),
  });

  r.route({
    method: 'POST',
    url: '/v1/merchant/instances/:instanceId/adjust',
    preHandler: [app.authenticate],
    schema: {
      tags: ['merchant'],
      params: z.object({ instanceId: z.string().uuid() }),
      body: zAdjustInstance,
    },
    handler: async (req) => {
      await adjustInstance(req.user!.id, req.params.instanceId, req.body);
      return { ok: true };
    },
  });
}
