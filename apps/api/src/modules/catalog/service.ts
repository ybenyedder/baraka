import { and, eq, sql } from 'drizzle-orm';
import { bagTemplates, bagSchedules, bagInstances, orders } from '@baraka/db';
import type { UpsertBagTemplate, UpsertSchedule, AdjustInstance } from '@baraka/shared';
import { getDb, getSql } from '../../lib/db';
import { errors } from '../../lib/errors';
import { getStorage } from '../../lib/storage';
import { processAndStoreImage } from '../../lib/images';
import { assertStoreOwnership } from '../merchant/guard';
import { sse } from '../../lib/sse';
import { notifyManyI18n } from '../notifications/service';

type Row = Record<string, unknown>;

async function assertTemplateOwnership(userId: string, templateId: string): Promise<string> {
  const tpl = await getDb().query.bagTemplates.findFirst({
    where: eq(bagTemplates.id, templateId),
  });
  if (!tpl) throw errors.notFound('Modèle de panier introuvable.');
  await assertStoreOwnership(userId, tpl.storeId);
  return tpl.storeId;
}

// ── Modèles de paniers ────────────────────────────────────────────────────────
export async function listTemplates(userId: string, storeId: string) {
  await assertStoreOwnership(userId, storeId);
  const storage = getStorage();
  const rows = await getDb().query.bagTemplates.findMany({
    where: eq(bagTemplates.storeId, storeId),
    orderBy: bagTemplates.createdAt,
  });
  return rows.map((t) => ({
    ...t,
    imageUrl: t.imageKey ? storage.urlForKey(t.imageKey) : null,
  }));
}

export async function createTemplate(userId: string, storeId: string, input: UpsertBagTemplate) {
  await assertStoreOwnership(userId, storeId);
  // Quota anti-abus : borne le nombre de modèles par boutique (borne le disque via images) (M7).
  const cntRows = (await getSql()`
    SELECT COUNT(*)::int AS n FROM bag_templates WHERE store_id = ${storeId}
  `) as unknown as Array<{ n: number }>;
  if ((cntRows[0]?.n ?? 0) >= 100) {
    throw errors.badRequest(
      'Nombre maximal de modèles de paniers atteint pour cette boutique (100).',
    );
  }
  const [tpl] = await getDb()
    .insert(bagTemplates)
    .values({
      storeId,
      name: input.name,
      description: input.description ?? null,
      bagCategory: input.bagCategory,
      dietary: input.dietary,
      priceMinor: input.priceMinor,
      originalValueMinor: input.originalValueMinor,
      currency: input.currency,
      active: input.active,
    })
    .returning();
  return tpl;
}

export async function updateTemplate(userId: string, templateId: string, input: UpsertBagTemplate) {
  await assertTemplateOwnership(userId, templateId);
  await getDb()
    .update(bagTemplates)
    .set({
      name: input.name,
      description: input.description ?? null,
      bagCategory: input.bagCategory,
      dietary: input.dietary,
      priceMinor: input.priceMinor,
      originalValueMinor: input.originalValueMinor,
      // La devise est fixée à la création et n'est jamais réécrite par un update (le champ
      // porte un défaut 'TND' qui, sinon, écraserait silencieusement une devise non-TND) (L18).
      active: input.active,
    })
    .where(eq(bagTemplates.id, templateId));
}

export async function setTemplateImage(userId: string, templateId: string, buffer: Buffer) {
  await assertTemplateOwnership(userId, templateId);
  const existing = await getDb().query.bagTemplates.findFirst({
    where: eq(bagTemplates.id, templateId),
    columns: { imageKey: true },
  });
  const stored = await processAndStoreImage(buffer);
  await getDb()
    .update(bagTemplates)
    .set({ imageKey: stored.key })
    .where(eq(bagTemplates.id, templateId));
  // Supprime l'ancienne image du template au remplacement (M7).
  if (existing?.imageKey && existing.imageKey !== stored.key)
    await getStorage().remove(existing.imageKey);
  return { url: stored.url };
}

// ── Plannings hebdomadaires ───────────────────────────────────────────────────
export async function listSchedules(userId: string, templateId: string) {
  await assertTemplateOwnership(userId, templateId);
  return getDb().query.bagSchedules.findMany({ where: eq(bagSchedules.bagTemplateId, templateId) });
}

export async function upsertSchedule(userId: string, templateId: string, input: UpsertSchedule) {
  await assertTemplateOwnership(userId, templateId);
  await getDb()
    .insert(bagSchedules)
    .values({
      bagTemplateId: templateId,
      weekday: input.weekday,
      pickupStart: input.pickupStart,
      pickupEnd: input.pickupEnd,
      quantity: input.quantity,
    })
    .onConflictDoUpdate({
      target: [bagSchedules.bagTemplateId, bagSchedules.weekday],
      set: { pickupStart: input.pickupStart, pickupEnd: input.pickupEnd, quantity: input.quantity },
    });
}

export async function deleteSchedule(userId: string, scheduleId: string) {
  const sched = await getDb().query.bagSchedules.findFirst({
    where: eq(bagSchedules.id, scheduleId),
  });
  if (!sched) throw errors.notFound('Planning introuvable.');
  await assertTemplateOwnership(userId, sched.bagTemplateId);
  await getDb().delete(bagSchedules).where(eq(bagSchedules.id, scheduleId));
}

// ── Instances du jour ─────────────────────────────────────────────────────────
export async function listTodayInstances(userId: string, storeId: string) {
  await assertStoreOwnership(userId, storeId);
  const sqlClient = getSql();
  return (await sqlClient`
    SELECT bi.id, bt.name AS title, bi.status, bi.pickup_start_at, bi.pickup_end_at,
           bi.quantity_total, bi.quantity_reserved, bi.quantity_sold,
           bi.price_minor, bi.currency
    FROM bag_instances bi JOIN bag_templates bt ON bt.id = bi.bag_template_id
    WHERE bi.store_id = ${storeId} AND bi.date = current_date
    ORDER BY bi.pickup_start_at ASC
  `) as unknown as Row[];
}

export async function adjustInstance(userId: string, instanceId: string, input: AdjustInstance) {
  const inst = await getDb().query.bagInstances.findFirst({
    where: eq(bagInstances.id, instanceId),
  });
  if (!inst) throw errors.notFound('Instance introuvable.');
  await assertStoreOwnership(userId, inst.storeId);

  if (input.cancel) {
    // Annulation en masse SANS bloquer la requête sur des appels réseau : toute la bascule
    // d'état + libération de stock se fait en UNE transaction (aucune commande orpheline
    // « reserved » sur une instance annulée). Les remboursements des commandes en ligne sont
    // émis de façon idempotente par le worker (reconcileRefunds) sous une minute (M14).
    const cancelled = await getDb().transaction(async (tx) => {
      await tx
        .update(bagInstances)
        .set({ status: 'cancelled' })
        .where(eq(bagInstances.id, instanceId));
      const rows = await tx
        .update(orders)
        .set({
          status: 'cancelled_store',
          cancelledAt: new Date(),
          cancelReason: 'Instance annulée par le commerçant',
        })
        .where(and(eq(orders.bagInstanceId, instanceId), eq(orders.status, 'reserved')))
        .returning({ id: orders.id, userId: orders.userId, number: orders.number });
      // Toutes les commandes réservées de l'instance sont annulées → réservé remis à 0.
      await tx.execute(
        sql`UPDATE bag_instances SET quantity_reserved = 0 WHERE id = ${instanceId}`,
      );
      return rows;
    });

    for (const o of cancelled) {
      sse.publish(`order:${o.id}`, 'order.cancelled', {
        orderId: o.id,
        status: 'cancelled_store',
        refundDue: true,
      });
    }
    await notifyManyI18n(
      'order_update',
      cancelled.map((o) => ({
        userId: o.userId,
        key: 'order_cancelled_store' as const,
        data: { orderId: o.id },
      })),
    );
    return;
  }
  if (input.quantityTotal !== undefined) {
    // On ne descend jamais sous ce qui est déjà réservé/vendu.
    await getDb()
      .update(bagInstances)
      .set({
        quantityTotal: sql`GREATEST(${input.quantityTotal}, quantity_reserved + quantity_sold)`,
      })
      .where(eq(bagInstances.id, instanceId));
  }
}

/**
 * Génère les instances vendables à partir des plannings, jusqu'à J+daysAhead.
 * Idempotent (ON CONFLICT). Exécuté chaque nuit par le worker.
 */
export async function generateInstances(daysAhead = 7): Promise<number> {
  const sqlClient = getSql();
  const rows = (await sqlClient`
    INSERT INTO bag_instances
      (bag_template_id, store_id, date, pickup_start_at, pickup_end_at, quantity_total,
       price_minor, original_value_minor, currency, status)
    SELECT bt.id, bt.store_id, d::date,
           (d::date + bs.pickup_start) AT TIME ZONE 'Africa/Tunis',
           (d::date + bs.pickup_end) AT TIME ZONE 'Africa/Tunis',
           bs.quantity, bt.price_minor, bt.original_value_minor, bt.currency, 'scheduled'
    FROM generate_series(current_date, current_date + (${daysAhead} || ' days')::interval, interval '1 day') d
    JOIN bag_schedules bs ON EXTRACT(DOW FROM d) = bs.weekday
    JOIN bag_templates bt ON bt.id = bs.bag_template_id AND bt.active = true
    JOIN stores s ON s.id = bt.store_id AND s.status = 'active'
    -- Ne régénère pas de stock vendable pour un commerçant suspendu (H1).
    JOIN merchants m ON m.id = s.merchant_id AND m.status = 'approved'
    WHERE bs.quantity > 0
    ON CONFLICT (bag_template_id, date) DO NOTHING
    RETURNING id
  `) as unknown as Row[];
  return rows.length;
}
