/**
 * Enums du domaine — source unique de vérité.
 * Chaque enum est exposé sous deux formes :
 *   - un tableau `const` (réutilisé par drizzle `pgEnum` et zod `z.enum`)
 *   - un type union dérivé.
 */

function asEnum<const T extends readonly string[]>(values: T): T {
  return values;
}

// ── Identité ────────────────────────────────────────────────────────────────
export const USER_ROLES = asEnum(['customer', 'merchant', 'admin']);
export type UserRole = (typeof USER_ROLES)[number];

export const LOCALES = asEnum(['fr', 'en', 'ar']);
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
/** Locales à écriture de droite à gauche. */
export const RTL_LOCALES: readonly Locale[] = ['ar'];

// ── Commerçants & boutiques ───────────────────────────────────────────────────
export const MERCHANT_STATUSES = asEnum(['pending', 'approved', 'rejected', 'suspended']);
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

export const MEMBER_ROLES = asEnum(['owner', 'staff']);
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const STORE_STATUSES = asEnum(['draft', 'active', 'paused', 'archived']);
export type StoreStatus = (typeof STORE_STATUSES)[number];

/** Catégories de boutique (seedées en table `store_categories`). */
export const STORE_CATEGORIES = asEnum([
  'meals',
  'bakery_pastry',
  'groceries',
  'cafe',
  'hotel_buffet',
  'other',
]);
export type StoreCategoryKey = (typeof STORE_CATEGORIES)[number];

// ── Offres (paniers) ──────────────────────────────────────────────────────────
export const BAG_CATEGORIES = asEnum(['meal', 'bakery', 'grocery', 'other']);
export type BagCategory = (typeof BAG_CATEGORIES)[number];

/** Régimes / allergènes déclarables sur un panier (stockés en jsonb, validés ici). */
export const DIETARY_FLAGS = asEnum([
  'vegetarian',
  'vegan',
  'halal',
  'gluten_free',
  'lactose_free',
  'contains_nuts',
  'contains_seafood',
]);
export type DietaryFlag = (typeof DIETARY_FLAGS)[number];

export const BAG_INSTANCE_STATUSES = asEnum([
  'scheduled',
  'live',
  'sold_out',
  'ended',
  'cancelled',
]);
export type BagInstanceStatus = (typeof BAG_INSTANCE_STATUSES)[number];

// 0 = dimanche … 6 = samedi (aligné sur Date.getDay()).
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// ── Commandes ────────────────────────────────────────────────────────────────
export const ORDER_STATUSES = asEnum([
  'pending_payment',
  'reserved',
  'picked_up',
  'cancelled_user',
  'cancelled_store',
  'no_show',
  'payment_failed',
]);
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** États terminaux : plus aucune transition possible. */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  'picked_up',
  'cancelled_user',
  'cancelled_store',
  'no_show',
  'payment_failed',
];

// ── Paiements ────────────────────────────────────────────────────────────────
export const PAYMENT_METHODS = asEnum(['cash', 'konnect', 'stripe']);
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = asEnum([
  'requires_action',
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded',
]);
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFUND_STATUSES = asEnum(['pending', 'succeeded', 'failed']);
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_REASONS = asEnum([
  'user_cancelled',
  'store_cancelled',
  'no_pickup_available',
  'goodwill',
  'admin',
]);
export type RefundReason = (typeof REFUND_REASONS)[number];

// ── Crédits & payouts ─────────────────────────────────────────────────────────
export const CREDIT_REASONS = asEnum([
  'referral_reward',
  'goodwill_refund',
  'admin_adjust',
  'redeemed',
]);
export type CreditReason = (typeof CREDIT_REASONS)[number];

export const PAYOUT_STATUSES = asEnum(['draft', 'approved', 'paid']);
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

// ── Engagement ───────────────────────────────────────────────────────────────
export const REVIEW_STATUSES = asEnum(['published', 'pending', 'hidden', 'removed']);
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const MODERATION_ENTITIES = asEnum(['review', 'store', 'user']);
export type ModerationEntity = (typeof MODERATION_ENTITIES)[number];

export const MODERATION_STATUSES = asEnum(['open', 'actioned', 'dismissed']);
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const REFERRAL_STATUSES = asEnum(['signed_up', 'qualified', 'rewarded']);
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const CAMPAIGN_TYPES = asEnum(['banner', 'featured_stores']);
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

// ── Notifications ────────────────────────────────────────────────────────────
export const NOTIFICATION_TYPES = asEnum([
  'order_update',
  'pickup_reminder',
  'favorite_new_bags',
  'review_request',
  'referral_reward',
  'payout',
  'marketing',
  'generic',
]);
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ── Contenu traduisible (surcharges commerçant) ──────────────────────────────
export const TRANSLATABLE_ENTITIES = asEnum(['store', 'bag_template']);
export type TranslatableEntity = (typeof TRANSLATABLE_ENTITIES)[number];
