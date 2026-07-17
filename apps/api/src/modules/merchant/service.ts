import { eq } from 'drizzle-orm';
import { merchants, merchantMembers } from '@baraka/db';
import type {
  ApplyMerchant,
  MerchantStats,
  UpdateMerchantProfile,
  MerchantOrder,
  MerchantOrdersQuery,
  MerchantAnalytics,
  OrderStatus,
  PaymentMethod,
} from '@baraka/shared';
import { getDb, getSql } from '../../lib/db';
import { errors } from '../../lib/errors';
import { getMerchantForUser, requireMerchant } from './guard';
import { SETTINGS } from '../../config/settings';

type Row = Record<string, unknown>;

/** Candidature commerçant : crée le merchant (pending) + rattache l'utilisateur (owner). */
export async function applyAsMerchant(userId: string, input: ApplyMerchant) {
  const existing = await getMerchantForUser(userId);
  if (existing) throw errors.conflict('Vous avez déjà un compte commerçant.');

  return getDb().transaction(async (tx) => {
    const [merchant] = await tx
      .insert(merchants)
      .values({
        legalName: input.legalName,
        taxId: input.taxId ?? null,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        status: 'pending',
        commissionBps: SETTINGS.defaultCommissionBps,
      })
      .returning();
    if (!merchant) throw errors.internal('Création du commerçant échouée.');
    await tx.insert(merchantMembers).values({ merchantId: merchant.id, userId, role: 'owner' });
    return { id: merchant.id, status: merchant.status };
  });
}

/** Projection PUBLIQUE du profil commerçant : n'expose JAMAIS admin_notes (notes internes
 *  de modération) au commerçant lui-même (M2). */
type MerchantRow = typeof merchants.$inferSelect;
function toMerchantProfile(m: MerchantRow) {
  return {
    id: m.id,
    status: m.status,
    legalName: m.legalName,
    taxId: m.taxId,
    contactEmail: m.contactEmail,
    contactPhone: m.contactPhone,
    payoutIban: m.payoutIban,
    commissionBps: m.commissionBps,
    createdAt: m.createdAt,
  };
}

export async function getMyMerchant(userId: string) {
  const ctx = await requireMerchant(userId);
  const merchant = await getDb().query.merchants.findFirst({
    where: eq(merchants.id, ctx.merchantId),
  });
  if (!merchant) throw errors.notFound('Commerçant introuvable.');
  return toMerchantProfile(merchant);
}

/** Met à jour le profil commerçant (contact, matricule, RIB) — raison sociale et commission restent admin. */
export async function updateMyMerchant(userId: string, input: UpdateMerchantProfile) {
  const ctx = await requireMerchant(userId);
  // Le profil (dont le RIB de versement et le matricule fiscal) n'est modifiable que par le
  // PROPRIÉTAIRE — un futur membre 'staff' ne doit pas pouvoir détourner les payouts (L1).
  if (ctx.role !== 'owner') {
    throw errors.forbidden('Seul le propriétaire du compte commerçant peut modifier le profil.');
  }
  const [updated] = await getDb()
    .update(merchants)
    .set({
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      taxId: input.taxId ?? null,
      payoutIban: input.payoutIban ?? null,
      updatedAt: new Date(),
    })
    .where(eq(merchants.id, ctx.merchantId))
    .returning();
  if (!updated) throw errors.notFound('Commerçant introuvable.');
  return toMerchantProfile(updated);
}

/** Commandes des boutiques du commerçant (jour du retrait ou historique). Jamais de pickupCode. */
export async function listMerchantOrders(
  userId: string,
  query: MerchantOrdersQuery,
): Promise<MerchantOrder[]> {
  const ctx = await requireMerchant(userId);
  const sqlClient = getSql();

  const rows = (await sqlClient`
    SELECT o.id, o.number, o.status, o.payment_method, o.quantity, o.total_minor, o.currency,
           o.created_at, o.picked_up_at,
           u.name AS customer_name,
           bt.name AS bag_title,
           bi.pickup_start_at, bi.pickup_end_at,
           s.id AS store_id, s.name AS store_name
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    JOIN bag_instances bi ON bi.id = o.bag_instance_id
    JOIN bag_templates bt ON bt.id = bi.bag_template_id
    JOIN users u ON u.id = o.user_id
    WHERE s.merchant_id = ${ctx.merchantId}
      AND (${query.storeId ?? null}::uuid IS NULL OR o.store_id = ${query.storeId ?? null}::uuid)
      AND (${query.status ?? null}::text IS NULL OR o.status::text = ${query.status ?? null})
      AND (${query.scope} != 'today' OR bi.date = current_date)
    ORDER BY o.created_at DESC
    LIMIT ${query.limit}
  `) as unknown as Row[];

  return rows.map((r) => ({
    id: String(r.id),
    number: String(r.number),
    status: r.status as OrderStatus,
    paymentMethod: r.payment_method as PaymentMethod,
    quantity: Number(r.quantity),
    totalMinor: Number(r.total_minor),
    currency: String(r.currency),
    customerName: (r.customer_name as string | null) ?? null,
    bagTitle: String(r.bag_title),
    storeId: String(r.store_id),
    storeName: String(r.store_name),
    pickupStartAt: r.pickup_start_at ? new Date(r.pickup_start_at as string).toISOString() : null,
    pickupEndAt: r.pickup_end_at ? new Date(r.pickup_end_at as string).toISOString() : null,
    createdAt: new Date(r.created_at as string).toISOString(),
    pickedUpAt: r.picked_up_at ? new Date(r.picked_up_at as string).toISOString() : null,
  }));
}

/** Analytics : série quotidienne (revenus/paniers) + totaux + répartition par boutique. */
export async function getMerchantAnalytics(
  userId: string,
  days: number,
): Promise<MerchantAnalytics> {
  const ctx = await requireMerchant(userId);
  const sqlClient = getSql();

  // Les 3 agrégats sont indépendants → exécutés en parallèle (pipeline postgres.js) plutôt
  // qu'en 3 allers-retours séquentiels (L15).
  const [series, totals, byStore] = (await Promise.all([
    sqlClient`
      SELECT d::date::text AS date,
             COALESCE(SUM(o.total_minor), 0) AS revenue,
             COALESCE(SUM(o.quantity), 0)    AS bags,
             COUNT(o.id)                     AS orders
      FROM generate_series(current_date - (${days - 1} || ' days')::interval, current_date, interval '1 day') d
      LEFT JOIN orders o
        ON o.picked_up_at >= d::date AND o.picked_up_at < d::date + 1 AND o.status = 'picked_up'
        AND o.store_id IN (SELECT id FROM stores WHERE merchant_id = ${ctx.merchantId})
      GROUP BY d::date
      ORDER BY d::date ASC
    `,
    sqlClient`
      SELECT
        COALESCE(SUM(o.total_minor) FILTER (WHERE o.status = 'picked_up'), 0) AS revenue,
        COALESCE(SUM(o.quantity)   FILTER (WHERE o.status = 'picked_up'), 0) AS bags,
        COUNT(*) FILTER (WHERE o.status = 'picked_up')                       AS orders,
        COUNT(*) FILTER (WHERE o.status IN ('cancelled_user', 'cancelled_store')) AS cancelled,
        COUNT(*) FILTER (WHERE o.status = 'no_show')                         AS no_show
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE s.merchant_id = ${ctx.merchantId}
        AND o.created_at >= current_date - (${days - 1} || ' days')::interval
    `,
    sqlClient`
      SELECT s.id AS store_id, s.name AS store_name,
             COALESCE(SUM(o.total_minor) FILTER (WHERE o.status = 'picked_up'), 0) AS revenue,
             COALESCE(SUM(o.quantity)   FILTER (WHERE o.status = 'picked_up'), 0) AS bags
      FROM stores s
      LEFT JOIN orders o
        ON o.store_id = s.id AND o.created_at >= current_date - (${days - 1} || ' days')::interval
      WHERE s.merchant_id = ${ctx.merchantId} AND s.deleted_at IS NULL
      GROUP BY s.id, s.name
      ORDER BY revenue DESC
    `,
  ])) as unknown as [Row[], Row[], Row[]];

  const t = totals[0] ?? {};
  return {
    days,
    currency: 'TND',
    series: series.map((r) => ({
      date: String(r.date),
      revenueMinor: Number(r.revenue ?? 0),
      bagsSold: Number(r.bags ?? 0),
      ordersCount: Number(r.orders ?? 0),
    })),
    totals: {
      revenueMinor: Number(t.revenue ?? 0),
      bagsSold: Number(t.bags ?? 0),
      ordersCount: Number(t.orders ?? 0),
      cancelledCount: Number(t.cancelled ?? 0),
      noShowCount: Number(t.no_show ?? 0),
    },
    byStore: byStore.map((r) => ({
      storeId: String(r.store_id),
      storeName: String(r.store_name),
      revenueMinor: Number(r.revenue ?? 0),
      bagsSold: Number(r.bags ?? 0),
    })),
  };
}

/** Statistiques agrégées sur toutes les boutiques du commerçant. */
export async function getMerchantStats(userId: string): Promise<MerchantStats> {
  const ctx = await requireMerchant(userId);
  const sqlClient = getSql();
  const rows = (await sqlClient`
    SELECT
      COALESCE(SUM(o.total_minor) FILTER (WHERE o.status = 'picked_up'), 0) AS revenue,
      COALESCE(SUM(o.quantity)   FILTER (WHERE o.status = 'picked_up'), 0) AS bags,
      COUNT(*) FILTER (WHERE o.status = 'picked_up')                       AS orders,
      (SELECT ROUND(AVG(rating_avg) / 100.0, 2) FROM stores WHERE merchant_id = ${ctx.merchantId} AND rating_count > 0) AS rating
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE s.merchant_id = ${ctx.merchantId}
  `) as unknown as Row[];
  const r = rows[0] ?? {};
  return {
    revenueMinor: Number(r.revenue ?? 0),
    currency: 'TND',
    bagsSold: Number(r.bags ?? 0),
    ordersCount: Number(r.orders ?? 0),
    ratingAvg: r.rating == null ? null : Number(r.rating),
  };
}
