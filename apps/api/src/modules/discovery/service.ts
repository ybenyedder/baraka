import { getSql } from '../../lib/db';
import { getStorage } from '../../lib/storage';
import type { NearbyQuery, BagCard, NearbyResponse, Currency, DietaryFlag } from '@baraka/shared';

type Row = Record<string, unknown>;

/**
 * Découverte : paniers « live » à proximité, triés par distance.
 * Cœur PostGIS : ST_DWithin (index GIST) + ST_Distance pour le tri.
 */
export async function findNearby(query: NearbyQuery): Promise<NearbyResponse> {
  const sql = getSql();
  const storage = getStorage();
  const offset = decodeCursor(query.cursor);

  const category = query.category;
  const q = query.q?.trim();
  const dietary = query.dietary ?? [];

  const rows = (await sql`
    SELECT
      bi.id                AS bag_instance_id,
      s.id                 AS store_id,
      s.slug               AS store_slug,
      s.name               AS store_name,
      COALESCE(sc.key, 'other') AS store_category,
      bt.bag_category      AS bag_category,
      bt.name              AS title,
      bt.image_key         AS image_key,
      bt.dietary           AS dietary,
      bi.price_minor       AS price_minor,
      bi.original_value_minor AS original_value_minor,
      bi.currency          AS currency,
      (bi.quantity_total - bi.quantity_reserved - bi.quantity_sold) AS qty_available,
      bi.pickup_start_at   AS pickup_start_at,
      bi.pickup_end_at     AS pickup_end_at,
      ST_Y(s.location::geometry) AS lat,
      ST_X(s.location::geometry) AS lng,
      s.rating_avg         AS rating_avg,
      s.rating_count       AS rating_count,
      ST_Distance(s.location, ST_MakePoint(${query.lng}, ${query.lat})::geography) AS distance_m
    FROM bag_instances bi
    JOIN stores s        ON s.id = bi.store_id AND s.status = 'active' AND s.deleted_at IS NULL
    -- Le commerçant doit être approuvé : une suspension retire immédiatement ses paniers
    -- de la découverte, même si la boutique est restée 'active' (H1).
    JOIN merchants mch   ON mch.id = s.merchant_id AND mch.status = 'approved'
    JOIN bag_templates bt ON bt.id = bi.bag_template_id
    LEFT JOIN store_categories sc ON sc.id = s.category_id
    WHERE bi.status = 'live'
      AND (bi.quantity_total - bi.quantity_reserved - bi.quantity_sold) > 0
      AND ST_DWithin(s.location, ST_MakePoint(${query.lng}, ${query.lat})::geography, ${query.radius})
      ${category ? sql`AND sc.key = ${category}` : sql``}
      ${q ? sql`AND (s.name ILIKE ${'%' + q + '%'} OR bt.name ILIKE ${'%' + q + '%'})` : sql``}
      ${dietary.length ? sql`AND bt.dietary @> ${JSON.stringify(dietary)}::jsonb` : sql``}
      ${query.pickupBefore ? sql`AND bi.pickup_start_at <= ${query.pickupBefore}` : sql``}
    ORDER BY distance_m ASC
    LIMIT ${query.limit + 1} OFFSET ${offset}
  `) as unknown as Row[];

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const items: BagCard[] = page.map((r) => ({
    bagInstanceId: String(r.bag_instance_id),
    storeId: String(r.store_id),
    storeSlug: String(r.store_slug),
    storeName: String(r.store_name),
    storeCategory: r.store_category as BagCard['storeCategory'],
    bagCategory: r.bag_category as BagCard['bagCategory'],
    title: String(r.title),
    imageUrl: r.image_key ? storage.urlForKey(String(r.image_key)) : null,
    price: { amountMinor: Number(r.price_minor), currency: String(r.currency) as Currency },
    originalValue: {
      amountMinor: Number(r.original_value_minor),
      currency: String(r.currency) as Currency,
    },
    dietary: (Array.isArray(r.dietary) ? r.dietary : []) as DietaryFlag[],
    quantityAvailable: Number(r.qty_available),
    pickupStartAt: new Date(r.pickup_start_at as string).toISOString(),
    pickupEndAt: new Date(r.pickup_end_at as string).toISOString(),
    lat: Number(r.lat),
    lng: Number(r.lng),
    distanceMeters: Math.round(Number(r.distance_m)),
    ratingAvg: r.rating_avg == null ? null : Number(r.rating_avg) / 100,
    ratingCount: Number(r.rating_count ?? 0),
  }));

  return { items, nextCursor: hasMore ? encodeCursor(offset + query.limit) : null };
}

/**
 * Détail autoritatif d'UN panier « live » par son id (checkout mobile) — mêmes règles de vente
 * que la découverte (boutique active + commerçant approuvé). Renvoie null si non commandable.
 * Permet à l'app d'afficher un prix VÉRIFIÉ plutôt que des params de deep link falsifiables (L10).
 */
export async function getBagCard(bagInstanceId: string): Promise<BagCard | null> {
  const sql = getSql();
  const storage = getStorage();
  const rows = (await sql`
    SELECT
      bi.id                AS bag_instance_id,
      s.id                 AS store_id,
      s.slug               AS store_slug,
      s.name               AS store_name,
      COALESCE(sc.key, 'other') AS store_category,
      bt.bag_category      AS bag_category,
      bt.name              AS title,
      bt.image_key         AS image_key,
      bt.dietary           AS dietary,
      bi.price_minor       AS price_minor,
      bi.original_value_minor AS original_value_minor,
      bi.currency          AS currency,
      (bi.quantity_total - bi.quantity_reserved - bi.quantity_sold) AS qty_available,
      bi.pickup_start_at   AS pickup_start_at,
      bi.pickup_end_at     AS pickup_end_at,
      ST_Y(s.location::geometry) AS lat,
      ST_X(s.location::geometry) AS lng,
      s.rating_avg         AS rating_avg,
      s.rating_count       AS rating_count
    FROM bag_instances bi
    JOIN stores s        ON s.id = bi.store_id AND s.status = 'active' AND s.deleted_at IS NULL
    JOIN merchants mch   ON mch.id = s.merchant_id AND mch.status = 'approved'
    JOIN bag_templates bt ON bt.id = bi.bag_template_id
    LEFT JOIN store_categories sc ON sc.id = s.category_id
    WHERE bi.id = ${bagInstanceId} AND bi.status = 'live'
    LIMIT 1
  `) as unknown as Row[];

  const r = rows[0];
  if (!r) return null;
  return {
    bagInstanceId: String(r.bag_instance_id),
    storeId: String(r.store_id),
    storeSlug: String(r.store_slug),
    storeName: String(r.store_name),
    storeCategory: r.store_category as BagCard['storeCategory'],
    bagCategory: r.bag_category as BagCard['bagCategory'],
    title: String(r.title),
    imageUrl: r.image_key ? storage.urlForKey(String(r.image_key)) : null,
    price: { amountMinor: Number(r.price_minor), currency: String(r.currency) as Currency },
    originalValue: {
      amountMinor: Number(r.original_value_minor),
      currency: String(r.currency) as Currency,
    },
    dietary: (Array.isArray(r.dietary) ? r.dietary : []) as DietaryFlag[],
    quantityAvailable: Number(r.qty_available),
    pickupStartAt: new Date(r.pickup_start_at as string).toISOString(),
    pickupEndAt: new Date(r.pickup_end_at as string).toISOString(),
    lat: Number(r.lat),
    lng: Number(r.lng),
    distanceMeters: 0,
    ratingAvg: r.rating_avg == null ? null : Number(r.rating_avg) / 100,
    ratingCount: Number(r.rating_count ?? 0),
  };
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const n = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
  // Entier borné uniquement : un curseur non entier / exponentiel / démesuré ne doit pas
  // atteindre l'OFFSET (erreur bigint → 500) sur cet endpoint public (L17).
  return Number.isInteger(n) && n >= 0 && n <= 10_000 ? n : 0;
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}
