import { eq } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { stores, storeCategories } from '@baraka/db';
import type { StoreDetail, UpsertStore, BagCard, Currency, DietaryFlag } from '@baraka/shared';
import { getDb, getSql } from '../../lib/db';
import { getStorage } from '../../lib/storage';
import { processAndStoreImage } from '../../lib/images';
import { errors } from '../../lib/errors';
import {
  assertStoreOwnership,
  requireMerchant,
  requireActiveMerchant,
  requireApprovedMerchant,
} from '../merchant/guard';

type Row = Record<string, unknown>;
const slugSuffix = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 5);

function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'boutique'}-${slugSuffix()}`;
}

async function categoryIdForKey(key: string | undefined): Promise<string | null> {
  if (!key) return null;
  const cat = await getDb().query.storeCategories.findFirst({
    where: eq(storeCategories.key, key),
  });
  return cat?.id ?? null;
}

/** Détail public d'une boutique (page SSR + écran mobile). */
export async function getStoreDetail(slug: string): Promise<StoreDetail> {
  const sqlClient = getSql();
  const storage = getStorage();

  const rows = (await sqlClient`
    SELECT s.id, s.slug, s.name, s.description, s.cover_image_key, s.logo_key,
           s.address_line, s.city, s.governorate, s.opening_hours,
           s.rating_avg, s.rating_count,
           ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
           sc.key AS category
    FROM stores s
    JOIN merchants m ON m.id = s.merchant_id
    LEFT JOIN store_categories sc ON sc.id = s.category_id
    WHERE s.slug = ${slug} AND s.deleted_at IS NULL
      -- Détail PUBLIC : uniquement une boutique active d'un commerçant approuvé (pas de
      -- brouillon/pause/archive ni de commerçant suspendu exposés/commandables) (M1/H1).
      AND s.status = 'active' AND m.status = 'approved'
    LIMIT 1
  `) as unknown as Row[];

  const s = rows[0];
  if (!s) throw errors.notFound('Boutique introuvable.');

  const bagRows = (await sqlClient`
    SELECT bi.id AS bag_instance_id, bt.bag_category, bt.name AS title, bt.image_key, bt.dietary,
           bi.price_minor, bi.original_value_minor, bi.currency,
           (bi.quantity_total - bi.quantity_reserved - bi.quantity_sold) AS qty_available,
           bi.pickup_start_at, bi.pickup_end_at
    FROM bag_instances bi JOIN bag_templates bt ON bt.id = bi.bag_template_id
    WHERE bi.store_id = ${String(s.id)} AND bi.status = 'live'
      AND (bi.quantity_total - bi.quantity_reserved - bi.quantity_sold) > 0
    ORDER BY bi.pickup_start_at ASC
  `) as unknown as Row[];

  const liveBags: BagCard[] = bagRows.map((r) => ({
    bagInstanceId: String(r.bag_instance_id),
    storeId: String(s.id),
    storeSlug: String(s.slug),
    storeName: String(s.name),
    storeCategory: (s.category ?? 'other') as BagCard['storeCategory'],
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
    lat: Number(s.lat),
    lng: Number(s.lng),
    distanceMeters: 0,
    ratingAvg: s.rating_avg == null ? null : Number(s.rating_avg) / 100,
    ratingCount: Number(s.rating_count ?? 0),
  }));

  return {
    id: String(s.id),
    slug: String(s.slug),
    name: String(s.name),
    description: (s.description as string | null) ?? null,
    category: (s.category as StoreDetail['category']) ?? null,
    coverImageUrl: s.cover_image_key ? storage.urlForKey(String(s.cover_image_key)) : null,
    logoUrl: s.logo_key ? storage.urlForKey(String(s.logo_key)) : null,
    addressLine: String(s.address_line),
    city: String(s.city),
    governorate: (s.governorate as string | null) ?? null,
    lat: Number(s.lat),
    lng: Number(s.lng),
    ratingAvg: s.rating_avg == null ? null : Number(s.rating_avg) / 100,
    ratingCount: Number(s.rating_count ?? 0),
    openingHours: (s.opening_hours as Record<string, string> | null) ?? null,
    liveBags,
  };
}

/** Crée une boutique (statut draft) pour le commerçant courant. */
export async function createStore(
  userId: string,
  input: UpsertStore,
): Promise<{ id: string; slug: string }> {
  // Un commerçant suspendu ne crée plus de boutique ; un 'pending' le peut (onboarding).
  const ctx = await requireActiveMerchant(userId);
  const sqlClient = getSql();
  // Quota anti-abus : borne le nombre de boutiques par commerçant (borne aussi la croissance
  // disque via les images) (M7).
  const cntRows = (await sqlClient`
    SELECT COUNT(*)::int AS n FROM stores WHERE merchant_id = ${ctx.merchantId} AND deleted_at IS NULL
  `) as unknown as Array<{ n: number }>;
  if ((cntRows[0]?.n ?? 0) >= 50) {
    throw errors.badRequest('Nombre maximal de boutiques atteint (50).');
  }
  const slug = slugify(input.name);
  const categoryId = await categoryIdForKey(input.category);

  const rows = (await sqlClient`
    INSERT INTO stores (merchant_id, slug, name, description, category_id, address_line, city, governorate, country, location, timezone, status, opening_hours)
    VALUES (${ctx.merchantId}, ${slug}, ${input.name}, ${input.description ?? null}, ${categoryId},
            ${input.addressLine}, ${input.city}, ${input.governorate ?? null}, 'TN',
            ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
            'Africa/Tunis', 'draft', ${input.openingHours ? sqlClient.json(input.openingHours) : null})
    RETURNING id, slug
  `) as unknown as Row[];

  const created = rows[0]!;
  return { id: String(created.id), slug: String(created.slug) };
}

/** Met à jour une boutique existante. */
export async function updateStore(
  userId: string,
  storeId: string,
  input: UpsertStore,
): Promise<void> {
  await assertStoreOwnership(userId, storeId);
  const sqlClient = getSql();
  const categoryId = await categoryIdForKey(input.category);
  await sqlClient`
    UPDATE stores SET
      name = ${input.name}, description = ${input.description ?? null}, category_id = ${categoryId},
      address_line = ${input.addressLine}, city = ${input.city}, governorate = ${input.governorate ?? null},
      location = ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
      opening_hours = ${input.openingHours ? sqlClient.json(input.openingHours) : null},
      updated_at = now()
    WHERE id = ${storeId}
  `;
}

/** Active/désactive la publication d'une boutique. */
export async function setStoreStatus(
  userId: string,
  storeId: string,
  status: 'active' | 'paused',
): Promise<void> {
  await assertStoreOwnership(userId, storeId);
  // Publier (passer 'active') exige un commerçant APPROUVÉ (l'appartenance ne suffit pas).
  if (status === 'active') await requireApprovedMerchant(userId);
  await getDb().update(stores).set({ status }).where(eq(stores.id, storeId));
}

/** Liste des boutiques du commerçant courant (avec lat/lng décodés et URLs d'images). */
export async function listMyStores(userId: string) {
  const ctx = await requireMerchant(userId);
  const sqlClient = getSql();
  const storage = getStorage();
  const rows = (await sqlClient`
    SELECT s.id, s.slug, s.name, s.description, s.status,
           s.address_line, s.city, s.governorate, s.opening_hours,
           s.cover_image_key, s.logo_key, s.rating_avg, s.rating_count,
           ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
           sc.key AS category
    FROM stores s
    LEFT JOIN store_categories sc ON sc.id = s.category_id
    WHERE s.merchant_id = ${ctx.merchantId} AND s.deleted_at IS NULL
    ORDER BY s.created_at ASC
  `) as unknown as Row[];

  return rows.map((s) => ({
    id: String(s.id),
    slug: String(s.slug),
    name: String(s.name),
    description: (s.description as string | null) ?? null,
    category: (s.category as string | null) ?? null,
    status: String(s.status),
    addressLine: String(s.address_line),
    city: String(s.city),
    governorate: (s.governorate as string | null) ?? null,
    lat: Number(s.lat),
    lng: Number(s.lng),
    openingHours: (s.opening_hours as Record<string, string> | null) ?? null,
    coverImageUrl: s.cover_image_key ? storage.urlForKey(String(s.cover_image_key)) : null,
    logoUrl: s.logo_key ? storage.urlForKey(String(s.logo_key)) : null,
    ratingAvg: s.rating_avg == null ? null : Number(s.rating_avg) / 100,
    ratingCount: Number(s.rating_count ?? 0),
  }));
}

/** Upload d'une image de boutique (couverture ou logo). */
export async function setStoreImage(
  userId: string,
  storeId: string,
  buffer: Buffer,
  which: 'cover' | 'logo',
): Promise<{ url: string }> {
  await assertStoreOwnership(userId, storeId);
  const existing = await getDb().query.stores.findFirst({
    where: eq(stores.id, storeId),
    columns: { coverImageKey: true, logoKey: true },
  });
  const stored = await processAndStoreImage(buffer);
  const column = which === 'cover' ? { coverImageKey: stored.key } : { logoKey: stored.key };
  await getDb().update(stores).set(column).where(eq(stores.id, storeId));
  // Supprime l'ancien fichier (sinon fuite disque non bornée à chaque remplacement) (M7).
  const oldKey = which === 'cover' ? existing?.coverImageKey : existing?.logoKey;
  if (oldKey && oldKey !== stored.key) await getStorage().remove(oldKey);
  return { url: stored.url };
}

/** Recalcule le cache de note d'une boutique (appelé après un nouvel avis). */
export async function recomputeStoreRating(storeId: string): Promise<void> {
  const sqlClient = getSql();
  await sqlClient`
    UPDATE stores s SET
      rating_avg = sub.avg, rating_count = sub.cnt
    FROM (
      SELECT ROUND(AVG(rating_overall) * 100)::int AS avg, COUNT(*)::int AS cnt
      FROM reviews WHERE store_id = ${storeId} AND status = 'published'
    ) sub
    WHERE s.id = ${storeId}
  `;
}
