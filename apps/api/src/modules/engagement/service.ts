import { and, eq, ne, sql as drizzleSql } from 'drizzle-orm';
import {
  reviews,
  favorites,
  orders,
  users,
  userStats,
  creditsLedger,
  referralEvents,
} from '@baraka/db';
import {
  co2eForBags,
  type CreateReview,
  type UserImpact,
  type FavoriteStore,
} from '@baraka/shared';
import { getDb, getSql } from '../../lib/db';
import { getStorage } from '../../lib/storage';
import { errors } from '../../lib/errors';
import { recomputeStoreRating } from '../stores/service';
import { notifyUserI18n, notifyManyI18n, type BulkRecipient } from '../notifications/service';
import { SETTINGS } from '../../config/settings';

type Row = Record<string, unknown>;

// ── Avis ──────────────────────────────────────────────────────────────────────
export async function createReview(userId: string, orderId: string, input: CreateReview) {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || order.userId !== userId) throw errors.notFound('Commande introuvable.');
  if (order.status !== 'picked_up')
    throw errors.badRequest('Seule une commande retirée peut être notée.');

  const existing = await db.query.reviews.findFirst({ where: eq(reviews.orderId, orderId) });
  if (existing) throw errors.conflict('Cette commande a déjà été notée.');

  const [review] = await db
    .insert(reviews)
    .values({
      orderId,
      userId,
      storeId: order.storeId,
      ratingOverall: input.ratingOverall,
      ratingFood: input.ratingFood ?? null,
      ratingQuantity: input.ratingQuantity ?? null,
      ratingService: input.ratingService ?? null,
      comment: input.comment ?? null,
      status: 'published',
    })
    .returning();

  await recomputeStoreRating(order.storeId);
  return review;
}

export async function listStoreReviews(slug: string) {
  const sql = getSql();
  return (await sql`
    SELECT r.id, u.name AS author_name, r.rating_overall, r.comment, r.created_at
    FROM reviews r
    JOIN stores s ON s.id = r.store_id
    JOIN users u ON u.id = r.user_id
    WHERE s.slug = ${slug} AND r.status = 'published'
    ORDER BY r.created_at DESC LIMIT 50
  `) as unknown as Row[];
}

// ── Favoris ───────────────────────────────────────────────────────────────────
export async function addFavorite(userId: string, storeId: string) {
  await getDb().insert(favorites).values({ userId, storeId }).onConflictDoNothing();
}
export async function removeFavorite(userId: string, storeId: string) {
  await getDb()
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.storeId, storeId)));
}
export async function listFavorites(userId: string): Promise<FavoriteStore[]> {
  const sql = getSql();
  const storage = getStorage();
  const rows = (await sql`
    SELECT s.id, s.slug, s.name, s.city, s.cover_image_key,
           COALESCE(sc.key, NULL) AS category,
           s.rating_avg, s.rating_count
    FROM favorites f
    JOIN stores s ON s.id = f.store_id
    LEFT JOIN store_categories sc ON sc.id = s.category_id
    WHERE f.user_id = ${userId} AND s.deleted_at IS NULL
    ORDER BY f.created_at DESC
  `) as unknown as Row[];
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    city: String(r.city),
    category: (r.category ?? null) as FavoriteStore['category'],
    coverImageUrl: r.cover_image_key ? storage.urlForKey(String(r.cover_image_key)) : null,
    ratingAvg: r.rating_avg == null ? null : Number(r.rating_avg) / 100,
    ratingCount: Number(r.rating_count ?? 0),
  }));
}

// ── Parrainage ────────────────────────────────────────────────────────────────
export async function getMyReferral(userId: string) {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw errors.notFound('Utilisateur introuvable.');
  const events = await db.query.referralEvents.findMany({
    where: eq(referralEvents.referrerUserId, userId),
  });
  return {
    code: user.referralCode,
    invited: events.length,
    rewarded: events.filter((e) => e.status === 'rewarded').length,
  };
}

/** Récompense le parrain au PREMIER retrait du filleul (crédit). Idempotent. */
export async function maybeRewardReferral(refereeUserId: string): Promise<void> {
  const db = getDb();
  const event = await db.query.referralEvents.findFirst({
    where: eq(referralEvents.refereeUserId, refereeUserId),
  });
  if (!event || event.status === 'rewarded') return;

  // Grant : 5,000 TND de crédit au parrain (paramétrable plus tard).
  const rewardMinor = 5000;
  // Transition CONDITIONNELLE d'abord : si deux retraits du filleul s'exécutent en parallèle,
  // un seul fait passer l'événement à 'rewarded' et crédite — pas de double crédit (M6).
  const rewarded = await db.transaction(async (tx) => {
    const rows = await tx
      .update(referralEvents)
      .set({ status: 'rewarded', rewardedAt: new Date() })
      .where(and(eq(referralEvents.id, event.id), ne(referralEvents.status, 'rewarded')))
      .returning({ id: referralEvents.id });
    if (rows.length === 0) return false;
    await tx.insert(creditsLedger).values({
      userId: event.referrerUserId,
      deltaMinor: rewardMinor,
      currency: 'TND',
      reason: 'referral_reward',
    });
    return true;
  });
  if (rewarded) {
    await notifyUserI18n(event.referrerUserId, 'referral_reward', 'referral_reward');
  }
}

// ── Impact ────────────────────────────────────────────────────────────────────
/** Met à jour les stats cumulées de l'utilisateur après un retrait. */
export async function updateUserStatsOnPickup(
  userId: string,
  order: {
    quantity: number;
    totalMinor: number;
    bagInstanceId: string;
  },
): Promise<void> {
  const sql = getSql();
  // Économie = (valeur d'origine − prix payé) via l'instance.
  const rows = (await sql`
    SELECT original_value_minor, price_minor FROM bag_instances WHERE id = ${order.bagInstanceId}
  `) as unknown as Row[];
  const inst = rows[0];
  const savedPerBag = inst
    ? Math.max(0, Number(inst.original_value_minor) - Number(inst.price_minor))
    : 0;
  const co2e = co2eForBags(order.quantity, { co2ePerBagG: SETTINGS.co2ePerBagG });

  await getDb()
    .insert(userStats)
    .values({
      userId,
      bagsSaved: order.quantity,
      co2eSavedG: co2e,
      moneySavedMinor: savedPerBag * order.quantity,
      currency: 'TND',
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        bagsSaved: sqlIncrement('bags_saved', order.quantity),
        co2eSavedG: sqlIncrement('co2e_saved_g', co2e),
        moneySavedMinor: sqlIncrement('money_saved_minor', savedPerBag * order.quantity),
      },
    });
}

export async function getUserImpact(userId: string): Promise<UserImpact> {
  const stat = await getDb().query.userStats.findFirst({ where: eq(userStats.userId, userId) });
  return {
    bagsSaved: stat?.bagsSaved ?? 0,
    co2eSavedG: stat?.co2eSavedG ?? (stat ? 0 : co2eForBags(0)),
    moneySaved: { amountMinor: stat?.moneySavedMinor ?? 0, currency: stat?.currency ?? 'TND' },
  };
}

// ── Push « nouveaux paniers chez tes favoris » (worker) ───────────────────────
export async function notifyFavoritesNewBags(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT DISTINCT f.user_id, s.id AS store_id, s.name AS store_name
    FROM favorites f
    JOIN stores s ON s.id = f.store_id
    JOIN bag_instances bi ON bi.store_id = s.id AND bi.status = 'live'
      AND (bi.quantity_total - bi.quantity_reserved - bi.quantity_sold) > 0
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = f.user_id AND n.type = 'favorite_new_bags'
        AND n.data->>'storeId' = s.id::text AND n.sent_at::date = current_date
    )
  `) as unknown as Row[];

  const recipients: BulkRecipient[] = rows.map((r) => ({
    userId: String(r.user_id),
    key: 'favorite_new_bags',
    params: { store: String(r.store_name) },
    data: { storeId: String(r.store_id) },
  }));
  await notifyManyI18n('favorite_new_bags', recipients);
  return rows.length;
}

// ── Campagnes publiques (home) ────────────────────────────────────────────────
export async function getActiveCampaigns(locale?: string): Promise<Row[]> {
  const sql = getSql();
  return (await sql`
    SELECT id, type, title, image_key, payload, sort
    FROM campaigns
    WHERE active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
      AND (locale IS NULL OR locale = ${locale ?? null})
    ORDER BY sort ASC, created_at DESC
  `) as unknown as Row[];
}

// ── Demande d'avis (~2 h après le retrait) ────────────────────────────────────
export async function sendReviewRequests(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT o.id, o.user_id, s.name AS store_name
    FROM orders o JOIN stores s ON s.id = o.store_id
    WHERE o.status = 'picked_up'
      AND o.picked_up_at BETWEEN now() - interval '4 hours' AND now() - interval '2 hours'
      AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = o.user_id AND n.type = 'review_request' AND n.data->>'orderId' = o.id::text
      )
  `) as unknown as Row[];

  const recipients: BulkRecipient[] = rows.map((r) => ({
    userId: String(r.user_id),
    key: 'review_request',
    params: { store: String(r.store_name) },
    data: { orderId: String(r.id) },
  }));
  await notifyManyI18n('review_request', recipients);
  return rows.length;
}

// Petit helper : incrément SQL atomique sur une colonne (qualifiée pour lever
// l'ambiguïté avec la pseudo-table EXCLUDED dans un ON CONFLICT DO UPDATE).
function sqlIncrement(column: string, by: number) {
  return drizzleSql.raw(`user_stats.${column} + ${Math.trunc(by)}`);
}
