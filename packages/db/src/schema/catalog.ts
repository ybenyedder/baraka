import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  time,
  date,
  timestamp,
  char,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { DietaryFlag } from '@baraka/shared';
import { bagCategoryEnum, bagInstanceStatusEnum } from './_enums';
import { timestamps } from './_helpers';
import { stores } from './merchants';

/** Modèle de panier réutilisable défini par la boutique. */
export const bagTemplates = pgTable(
  'bag_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    bagCategory: bagCategoryEnum('bag_category').default('meal').notNull(),
    /** Régimes/allergènes (jsonb, validés par DIETARY_FLAGS). */
    dietary: jsonb('dietary').$type<DietaryFlag[]>().default([]).notNull(),
    /** Prix de vente, en unités mineures. */
    priceMinor: integer('price_minor').notNull(),
    /** Valeur d'origine estimée, en unités mineures. */
    originalValueMinor: integer('original_value_minor').notNull(),
    currency: char('currency', { length: 3 }).default('TND').notNull(),
    imageKey: text('image_key'),
    active: boolean('active').default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    index('bag_templates_store_idx').on(t.storeId),
    // Le prix de vente ne peut dépasser la valeur d'origine (sinon « remise » négative,
    // stats d'économie faussées) ; montants toujours positifs.
    check(
      'bag_templates_price_valid',
      sql`${t.priceMinor} >= 0 AND ${t.originalValueMinor} >= 0 AND ${t.priceMinor} <= ${t.originalValueMinor}`,
    ),
  ],
);

/** Planning hebdomadaire récurrent d'un modèle de panier. */
export const bagSchedules = pgTable(
  'bag_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bagTemplateId: uuid('bag_template_id')
      .notNull()
      .references(() => bagTemplates.id, { onDelete: 'cascade' }),
    /** 0 = dimanche … 6 = samedi. */
    weekday: integer('weekday').notNull(),
    pickupStart: time('pickup_start').notNull(),
    pickupEnd: time('pickup_end').notNull(),
    quantity: integer('quantity').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('bag_schedules_template_weekday_unique').on(t.bagTemplateId, t.weekday),
    // Invariants : jour valide (0=dimanche..6=samedi), fin après début (pas de créneau nul
    // ou inversé qui rendrait l'instance jamais « live »), quantité non négative.
    check('bag_schedules_weekday_valid', sql`${t.weekday} BETWEEN 0 AND 6`),
    check('bag_schedules_window_valid', sql`${t.pickupEnd} > ${t.pickupStart}`),
    check('bag_schedules_qty_nonneg', sql`${t.quantity} >= 0`),
  ],
);

/**
 * Instance vendable d'un panier pour une date donnée (« drop »).
 * Générée par un job nocturne à J+7 glissant à partir des plannings.
 * quantity_reserved + quantity_sold ≤ quantity_total (garde atomique côté SQL).
 */
export const bagInstances = pgTable(
  'bag_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bagTemplateId: uuid('bag_template_id')
      .notNull()
      .references(() => bagTemplates.id, { onDelete: 'cascade' }),
    /** Dénormalisé pour les jointures de découverte. */
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    pickupStartAt: timestamp('pickup_start_at', { withTimezone: true }).notNull(),
    pickupEndAt: timestamp('pickup_end_at', { withTimezone: true }).notNull(),

    quantityTotal: integer('quantity_total').notNull(),
    quantityReserved: integer('quantity_reserved').default(0).notNull(),
    quantitySold: integer('quantity_sold').default(0).notNull(),

    // Snapshot du prix au moment du drop (le template peut évoluer ensuite).
    priceMinor: integer('price_minor').notNull(),
    originalValueMinor: integer('original_value_minor').notNull(),
    currency: char('currency', { length: 3 }).default('TND').notNull(),

    status: bagInstanceStatusEnum('status').default('scheduled').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('bag_instances_template_date_unique').on(t.bagTemplateId, t.date),
    index('bag_instances_store_idx').on(t.storeId),
    index('bag_instances_status_pickup_idx').on(t.status, t.pickupStartAt),
    // Invariants de stock au niveau BDD (défense en profondeur, en plus de la garde applicative).
    check('bag_instances_qty_nonneg', sql`${t.quantityReserved} >= 0 AND ${t.quantitySold} >= 0`),
    check(
      'bag_instances_qty_bounded',
      sql`${t.quantityReserved} + ${t.quantitySold} <= ${t.quantityTotal}`,
    ),
    // Fenêtre de retrait cohérente (fin après début) et prix valide (cohérent avec le template).
    check('bag_instances_window_valid', sql`${t.pickupEndAt} > ${t.pickupStartAt}`),
    check(
      'bag_instances_price_valid',
      sql`${t.priceMinor} >= 0 AND ${t.originalValueMinor} >= 0 AND ${t.priceMinor} <= ${t.originalValueMinor}`,
    ),
  ],
);
