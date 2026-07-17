import { pgTable, uuid, text, integer, jsonb, date, timestamp, index } from 'drizzle-orm/pg-core';
import { timestamps } from './_helpers';
import { users } from './auth';

/** Journal d'audit des actions admin. */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: uuid('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('admin_audit_actor_idx').on(t.actorUserId),
    index('admin_audit_entity_idx').on(t.entityType, t.entityId),
  ],
);

/** Réglages applicatifs clé/valeur (jsonb). */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  ...timestamps,
});

/** Stats cumulées par utilisateur (mises à jour au retrait). */
export const userStats = pgTable('user_stats', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bagsSaved: integer('bags_saved').default(0).notNull(),
  co2eSavedG: integer('co2e_saved_g').default(0).notNull(),
  moneySavedMinor: integer('money_saved_minor').default(0).notNull(),
  currency: text('currency').default('TND').notNull(),
  ...timestamps,
});

/** Agrégats quotidiens plateforme (rollup nocturne, dashboard admin). */
export const platformStatsDaily = pgTable('platform_stats_daily', {
  date: date('date').primaryKey(),
  orders: integer('orders').default(0).notNull(),
  gmvMinor: integer('gmv_minor').default(0).notNull(),
  bagsSaved: integer('bags_saved').default(0).notNull(),
  newUsers: integer('new_users').default(0).notNull(),
  activeStores: integer('active_stores').default(0).notNull(),
});
