import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { userRoleEnum, localeEnum, platformEnum } from './_enums';
import { timestamps, softDelete } from './_helpers';

/**
 * Tables compatibles better-auth (users/sessions/accounts/verifications).
 * On mappe better-auth vers ces noms via sa config d'adaptateur Drizzle.
 * `users` porte des champs métier additionnels (role, locale, parrainage…).
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),

    // ── Champs métier ──
    role: userRoleEnum('role').default('customer').notNull(),
    locale: localeEnum('locale').default('fr').notNull(),
    phone: text('phone'),
    referralCode: text('referral_code').notNull(),
    referredByUserId: uuid('referred_by_user_id').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    /** Nombre de no-shows cumulés (politique de strikes sur le paiement cash). */
    noShowCount: integer('no_show_count').default(0).notNull(),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    uniqueIndex('users_referral_code_unique').on(t.referralCode),
    index('users_referred_by_idx').on(t.referredByUserId),
    index('users_role_idx').on(t.role),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('sessions_token_unique').on(t.token),
    index('sessions_user_idx').on(t.userId),
  ],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Identifiant du compte chez le provider (ou l'email pour credentials). */
    accountId: text('account_id').notNull(),
    /** 'credential' | 'google' | 'apple' … */
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    /** Hash du mot de passe pour le provider 'credential'. */
    password: text('password'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('accounts_provider_account_unique').on(t.providerId, t.accountId),
    index('accounts_user_idx').on(t.userId),
  ],
);

export const verifications = pgTable(
  'verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);

/** Devices pour les notifications push Expo. */
export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expoPushToken: text('expo_push_token').notNull(),
    platform: platformEnum('platform').notNull(),
    appVersion: text('app_version'),
    locale: localeEnum('locale'),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('devices_expo_token_unique').on(t.expoPushToken),
    index('devices_user_idx').on(t.userId),
  ],
);

/** Préférences de notification (1 ligne par utilisateur). */
export const notificationPrefs = pgTable('notification_prefs', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  favoritesNewBags: boolean('favorites_new_bags').default(true).notNull(),
  pickupReminders: boolean('pickup_reminders').default(true).notNull(),
  orderUpdates: boolean('order_updates').default(true).notNull(),
  marketing: boolean('marketing').default(false).notNull(),
  ...timestamps,
});
