import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import {
  reviewStatusEnum,
  moderationEntityEnum,
  moderationStatusEnum,
  referralStatusEnum,
  campaignTypeEnum,
  notificationTypeEnum,
  localeEnum,
} from './_enums';
import { timestamps } from './_helpers';
import { users } from './auth';
import { stores } from './merchants';
import { orders } from './orders';

/** Favoris : (user, store). */
export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.storeId] }),
    index('favorites_store_idx').on(t.storeId),
  ],
);

/** Avis vérifié : exactement une note par commande retirée. */
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    ratingOverall: integer('rating_overall').notNull(),
    ratingFood: integer('rating_food'),
    ratingQuantity: integer('rating_quantity'),
    ratingService: integer('rating_service'),
    comment: text('comment'),
    status: reviewStatusEnum('status').default('published').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('reviews_order_unique').on(t.orderId),
    index('reviews_store_idx').on(t.storeId),
    index('reviews_status_idx').on(t.status),
  ],
);

/** Signalements de modération. */
export const moderationReports = pgTable(
  'moderation_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: moderationEntityEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    reporterUserId: uuid('reporter_user_id').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    status: moderationStatusEnum('status').default('open').notNull(),
    handledBy: uuid('handled_by').references(() => users.id, { onDelete: 'set null' }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('moderation_reports_status_idx').on(t.status)],
);

/** Boîte de réception in-app (miroir des push). */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    /** Payload de deep link. */
    data: jsonb('data').$type<Record<string, unknown>>(),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => [
    index('notifications_user_read_idx').on(t.userId, t.readAt),
    // Sous-requêtes de dédoublonnage du fan-out worker (par utilisateur, type, jour).
    index('notifications_user_type_sent_idx').on(t.userId, t.type, t.sentAt),
  ],
);

/** Événements de parrainage — récompense au premier retrait du filleul. */
export const referralEvents = pgTable(
  'referral_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    referrerUserId: uuid('referrer_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refereeUserId: uuid('referee_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: referralStatusEnum('status').default('signed_up').notNull(),
    qualifiedOrderId: uuid('qualified_order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    rewardedAt: timestamp('rewarded_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('referral_events_referee_unique').on(t.refereeUserId),
    index('referral_events_referrer_idx').on(t.referrerUserId),
  ],
);

/** Campagnes marketing (bannières / mise en avant de boutiques). */
export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: campaignTypeEnum('type').notNull(),
    title: text('title').notNull(),
    imageKey: text('image_key'),
    /** Ciblage de langue optionnel. */
    locale: localeEnum('locale'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    active: boolean('active').default(true).notNull(),
    sort: integer('sort').default(0).notNull(),
    ...timestamps,
  },
  (t) => [index('campaigns_active_idx').on(t.active)],
);
