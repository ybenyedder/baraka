import {
  pgTable,
  uuid,
  text,
  integer,
  char,
  jsonb,
  timestamp,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  orderStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  refundStatusEnum,
  refundReasonEnum,
  creditReasonEnum,
  payoutStatusEnum,
} from './_enums';
import { timestamps } from './_helpers';
import { users } from './auth';
import { stores, merchants } from './merchants';
import { bagInstances } from './catalog';

/** Réservation d'un panier par un client. */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Numéro lisible : BRK-2026-000123. */
    number: text('number').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    bagInstanceId: uuid('bag_instance_id')
      .notNull()
      .references(() => bagInstances.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),

    quantity: integer('quantity').default(1).notNull(),
    unitPriceMinor: integer('unit_price_minor').notNull(),
    totalMinor: integer('total_minor').notNull(),
    creditAppliedMinor: integer('credit_applied_minor').default(0).notNull(),
    currency: char('currency', { length: 3 }).default('TND').notNull(),

    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    status: orderStatusEnum('status').notNull(),
    /** Code de retrait à 6 caractères (présenté/saisi au comptoir). */
    pickupCode: char('pickup_code', { length: 6 }),

    /** Expiration de la retenue de stock (paiement en ligne en attente). */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    reservedAt: timestamp('reserved_at', { withTimezone: true }),
    pickedUpAt: timestamp('picked_up_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('orders_number_unique').on(t.number),
    index('orders_user_idx').on(t.userId),
    index('orders_bag_instance_idx').on(t.bagInstanceId),
    index('orders_store_idx').on(t.storeId),
    index('orders_status_idx').on(t.status),
    index('orders_expires_idx').on(t.expiresAt),
    // Requêtes chaudes de stats/analytics (dashboards admin & commerçant).
    index('orders_created_at_idx').on(t.createdAt),
    index('orders_picked_up_at_idx').on(t.pickedUpAt),
    // Un code de retrait est unique parmi les commandes réservées d'une même boutique :
    // empêche qu'une collision (10^6) fasse valider la mauvaise commande (LIMIT 1 arbitraire).
    uniqueIndex('orders_pickup_code_reserved_unique')
      .on(t.storeId, t.pickupCode)
      .where(sql`status = 'reserved' AND pickup_code IS NOT NULL`),
  ],
);

/** Tentative de paiement rattachée à une commande. */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: paymentMethodEnum('provider').notNull(),
    providerRef: text('provider_ref'),
    amountMinor: integer('amount_minor').notNull(),
    currency: char('currency', { length: 3 }).default('TND').notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    checkoutUrl: text('checkout_url'),
    idempotencyKey: text('idempotency_key').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('payments_idempotency_unique').on(t.idempotencyKey),
    index('payments_order_idx').on(t.orderId),
    index('payments_provider_ref_idx').on(t.provider, t.providerRef),
    index('payments_status_idx').on(t.status),
  ],
);

/** Journal des événements de paiement (webhooks) — traitement idempotent. */
export const paymentEvents = pgTable(
  'payment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: paymentMethodEnum('provider').notNull(),
    /** Identifiant d'événement fourni par le provider (dédoublonnage). */
    providerEventId: text('provider_event_id').notNull(),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('payment_events_provider_event_unique').on(t.provider, t.providerEventId),
    index('payment_events_payment_idx').on(t.paymentId),
  ],
);

/** Remboursement (total ou partiel) d'un paiement. */
export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    currency: char('currency', { length: 3 }).default('TND').notNull(),
    reason: refundReasonEnum('reason').notNull(),
    status: refundStatusEnum('status').default('pending').notNull(),
    providerRef: text('provider_ref'),
    /** 'system' ou id admin. */
    createdBy: text('created_by').default('system').notNull(),
    ...timestamps,
  },
  (t) => [
    index('refunds_payment_idx').on(t.paymentId),
    // Un seul remboursement actif (en cours/réussi) par paiement : filet anti double-remboursement
    // en plus de la garde applicative (annulations concurrentes / retries).
    uniqueIndex('refunds_payment_active_unique')
      .on(t.paymentId)
      .where(sql`status IN ('pending', 'succeeded')`),
  ],
);

/** Grand livre des crédits utilisateur (solde = SUM(delta_minor)). */
export const creditsLedger = pgTable(
  'credits_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // RESTRICT (et non cascade) : un compte porteur d'un historique de crédits ne doit pas
    // pouvoir être supprimé physiquement (le projet fonctionne en soft-delete) — sinon le
    // grand livre disparaît sans trace.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** Signé : + crédit accordé, − crédit consommé. */
    deltaMinor: integer('delta_minor').notNull(),
    currency: char('currency', { length: 3 }).default('TND').notNull(),
    reason: creditReasonEnum('reason').notNull(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('credits_ledger_user_idx').on(t.userId),
    // Un seul débit 'redeemed' par commande : filet d'idempotence contre un double-débit
    // du même crédit sur une même commande.
    uniqueIndex('credits_ledger_order_redeemed_unique')
      .on(t.orderId)
      .where(sql`reason = 'redeemed' AND order_id IS NOT NULL`),
  ],
);

/** Versement à un commerçant sur une période. */
export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // RESTRICT : un commerçant avec un historique de versements ne peut être supprimé
    // physiquement (soft-delete attendu) — le grand livre des payouts doit survivre.
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    grossMinor: integer('gross_minor').notNull(),
    commissionMinor: integer('commission_minor').notNull(),
    netMinor: integer('net_minor').notNull(),
    currency: char('currency', { length: 3 }).default('TND').notNull(),
    status: payoutStatusEnum('status').default('draft').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    bankReference: text('bank_reference'),
    ...timestamps,
  },
  (t) => [
    index('payouts_merchant_idx').on(t.merchantId),
    index('payouts_status_idx').on(t.status),
    // Un seul payout par commerçant et par période (empêche les brouillons dupliqués).
    uniqueIndex('payouts_merchant_period_unique').on(t.merchantId, t.periodStart, t.periodEnd),
  ],
);

/** Lignes d'un payout (1 commande = 1 ligne, unicité garantie). */
export const payoutItems = pgTable(
  'payout_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payoutId: uuid('payout_id')
      .notNull()
      .references(() => payouts.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    grossMinor: integer('gross_minor').notNull(),
    commissionMinor: integer('commission_minor').notNull(),
    netMinor: integer('net_minor').notNull(),
  },
  (t) => [
    uniqueIndex('payout_items_order_unique').on(t.orderId),
    index('payout_items_payout_idx').on(t.payoutId),
  ],
);
