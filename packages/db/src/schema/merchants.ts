import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import {
  merchantStatusEnum,
  memberRoleEnum,
  storeStatusEnum,
  localeEnum,
  translatableEntityEnum,
} from './_enums';
import { geographyPoint, timestamps, softDelete } from './_helpers';
import { users } from './auth';

/** Entité commerçante (personne morale) — validée par l'admin avant d'être active. */
export const merchants = pgTable(
  'merchants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    legalName: text('legal_name').notNull(),
    /** Matricule fiscal tunisien. */
    taxId: text('tax_id'),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone'),
    status: merchantStatusEnum('status').default('pending').notNull(),
    /** Commission plateforme en points de base (ex : 1500 = 15 %). */
    commissionBps: integer('commission_bps').default(1500).notNull(),
    /** Coordonnées bancaires pour les payouts (RIB/IBAN). */
    payoutIban: text('payout_iban'),
    adminNotes: text('admin_notes'),
    ...timestamps,
  },
  (t) => [index('merchants_status_idx').on(t.status)],
);

/** Membres d'un commerçant (owner/staff) — rattache des users à un merchant. */
export const merchantMembers = pgTable(
  'merchant_members',
  {
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').default('owner').notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.merchantId, t.userId] }),
    index('merchant_members_user_idx').on(t.userId),
  ],
);

/** Catégories de boutique (seedées). */
export const storeCategories = pgTable('store_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  /** Ordre d'affichage. */
  sort: integer('sort').default(0).notNull(),
});

/** Boutique physique appartenant à un commerçant (point de retrait). */
export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: uuid('category_id').references(() => storeCategories.id),
    coverImageKey: text('cover_image_key'),
    logoKey: text('logo_key'),

    // ── Adresse & géo ──
    addressLine: text('address_line').notNull(),
    city: text('city').notNull(),
    governorate: text('governorate'),
    country: text('country').default('TN').notNull(),
    /** PostGIS geography(Point,4326) — cœur des requêtes de proximité. */
    location: geographyPoint('location').notNull(),
    timezone: text('timezone').default('Africa/Tunis').notNull(),

    /** Horaires d'ouverture (affichage uniquement). */
    openingHours: jsonb('opening_hours').$type<Record<string, string>>(),

    // ── Cache dénormalisé des notes ──
    ratingAvg: integer('rating_avg'), // ×100 (ex : 452 = 4,52) pour rester entier
    ratingCount: integer('rating_count').default(0).notNull(),

    status: storeStatusEnum('status').default('draft').notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('stores_slug_unique').on(t.slug),
    index('stores_merchant_idx').on(t.merchantId),
    index('stores_status_idx').on(t.status),
    index('stores_city_idx').on(t.city),
    // Index spatial GIST — indispensable pour ST_DWithin.
    index('stores_location_gix').using('gist', t.location),
  ],
);

/**
 * Surcharges de traduction facultatives pour le contenu écrit par le commerçant
 * (nom/description de boutique ou de panier). Fallback sur la langue source si absent.
 */
export const contentTranslations = pgTable(
  'content_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: translatableEntityEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    field: text('field').notNull(),
    locale: localeEnum('locale').notNull(),
    text: text('text').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('content_translations_unique').on(t.entityType, t.entityId, t.field, t.locale),
  ],
);

export type StoreOpeningHours = Record<string, string>;
