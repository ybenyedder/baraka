import { and, desc, eq } from 'drizzle-orm';
import {
  merchants,
  merchantMembers,
  users,
  stores,
  orders,
  reviews,
  moderationReports,
  campaigns,
  adminAuditLog,
} from '@baraka/db';
import type {
  ApproveMerchant,
  ModerateReview,
  ResolveReport,
  UpsertCampaign,
  AdminStats,
  MerchantStatus,
} from '@baraka/shared';
import { getDb, getSql } from '../../lib/db';
import { errors } from '../../lib/errors';

type Row = Record<string, unknown>;

// ── Commerçants ───────────────────────────────────────────────────────────────
export async function listMerchants(status?: MerchantStatus, limit = 100) {
  const db = getDb();
  return status
    ? db.query.merchants.findMany({
        where: eq(merchants.status, status),
        orderBy: desc(merchants.createdAt),
        limit,
      })
    : db.query.merchants.findMany({ orderBy: desc(merchants.createdAt), limit });
}

export async function approveMerchant(
  adminId: string,
  merchantId: string,
  decision: ApproveMerchant,
) {
  const db = getDb();
  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, merchantId) });
  if (!merchant) throw errors.notFound('Commerçant introuvable.');

  await db.transaction(async (tx) => {
    await tx
      .update(merchants)
      .set({
        status: decision.status,
        commissionBps: decision.commissionBps ?? merchant.commissionBps,
        adminNotes: decision.notes ?? merchant.adminNotes,
      })
      .where(eq(merchants.id, merchantId));

    // À l'approbation, on élève le rôle des membres owner à 'merchant'.
    if (decision.status === 'approved') {
      const owners = await tx.query.merchantMembers.findMany({
        where: eq(merchantMembers.merchantId, merchantId),
      });
      for (const owner of owners) {
        await tx.update(users).set({ role: 'merchant' }).where(eq(users.id, owner.userId));
      }
    }

    // À la suspension/rejet, on COUPE l'activité : boutiques actives → 'paused' (retirées de la
    // découverte) et membres 'merchant' rétrogradés en 'customer' (H1 — la sanction devient réelle).
    if (decision.status === 'suspended' || decision.status === 'rejected') {
      await tx
        .update(stores)
        .set({ status: 'paused' })
        .where(and(eq(stores.merchantId, merchantId), eq(stores.status, 'active')));
      const members = await tx.query.merchantMembers.findMany({
        where: eq(merchantMembers.merchantId, merchantId),
      });
      for (const m of members) {
        await tx
          .update(users)
          .set({ role: 'customer' })
          .where(and(eq(users.id, m.userId), eq(users.role, 'merchant')));
      }
    }

    await tx.insert(adminAuditLog).values({
      actorUserId: adminId,
      action: `merchant.${decision.status}`,
      entityType: 'merchant',
      entityId: merchantId,
      after: { status: decision.status, commissionBps: decision.commissionBps },
    });
  });
  return { status: decision.status };
}

// ── Listes ────────────────────────────────────────────────────────────────────
export async function listUsers(limit = 50) {
  return getDb().query.users.findMany({ orderBy: desc(users.createdAt), limit });
}
export async function listStores(limit = 50) {
  return getDb().query.stores.findMany({ orderBy: desc(stores.createdAt), limit });
}
export async function listOrders(limit = 50) {
  return getDb().query.orders.findMany({ orderBy: desc(orders.createdAt), limit });
}

// ── Modération ────────────────────────────────────────────────────────────────
export async function moderateReview(reviewId: string, input: ModerateReview) {
  const db = getDb();
  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
  if (!review) throw errors.notFound('Avis introuvable.');
  await db.update(reviews).set({ status: input.status }).where(eq(reviews.id, reviewId));
}

export async function listReports() {
  return getDb().query.moderationReports.findMany({
    where: eq(moderationReports.status, 'open'),
    orderBy: desc(moderationReports.createdAt),
  });
}

export async function resolveReport(adminId: string, reportId: string, input: ResolveReport) {
  await getDb()
    .update(moderationReports)
    .set({ status: input.status, handledBy: adminId, handledAt: new Date() })
    .where(eq(moderationReports.id, reportId));
}

// ── Campagnes ─────────────────────────────────────────────────────────────────
export async function listCampaigns() {
  return getDb().query.campaigns.findMany({ orderBy: desc(campaigns.createdAt) });
}

export async function upsertCampaign(input: UpsertCampaign, id?: string) {
  const db = getDb();
  const values = {
    type: input.type,
    title: input.title,
    locale: input.locale,
    payload: input.payload,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    active: input.active,
    sort: input.sort,
  };
  if (id) {
    await db.update(campaigns).set(values).where(eq(campaigns.id, id));
    return { id };
  }
  const [created] = await db.insert(campaigns).values(values).returning({ id: campaigns.id });
  return { id: created!.id };
}

// ── Tableau de bord ───────────────────────────────────────────────────────────
// Cache mémoire court : le dashboard admin ne doit pas relancer 6 agrégats à chaque affichage.
let statsCache: { at: number; value: AdminStats } | null = null;

export async function getAdminStats(): Promise<AdminStats> {
  if (statsCache && Date.now() - statsCache.at < 30_000) return statsCache.value;
  const sqlClient = getSql();
  // Prédicats de date SARGABLES (`>= current_date AND < current_date + 1`) : exploitables par
  // l'index sur orders(created_at), contrairement à `created_at::date = current_date` (L14).
  const rows = (await sqlClient`
    SELECT
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS users,
      (SELECT COUNT(*) FROM merchants) AS merchants,
      (SELECT COUNT(*) FROM stores WHERE status = 'active' AND deleted_at IS NULL) AS active_stores,
      (SELECT COUNT(*) FROM orders WHERE created_at >= current_date AND created_at < current_date + 1) AS orders_today,
      (SELECT COALESCE(SUM(total_minor), 0) FROM orders
        WHERE created_at >= current_date AND created_at < current_date + 1
          AND status IN ('reserved','picked_up')) AS gmv_today,
      (SELECT COALESCE(SUM(quantity), 0) FROM orders WHERE status = 'picked_up') AS bags_saved
  `) as unknown as Row[];
  const r = rows[0] ?? {};
  const value: AdminStats = {
    users: Number(r.users ?? 0),
    merchants: Number(r.merchants ?? 0),
    activeStores: Number(r.active_stores ?? 0),
    ordersToday: Number(r.orders_today ?? 0),
    gmvTodayMinor: Number(r.gmv_today ?? 0),
    bagsSavedTotal: Number(r.bags_saved ?? 0),
  };
  statsCache = { at: Date.now(), value };
  return value;
}
