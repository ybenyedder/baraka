import { pgEnum } from 'drizzle-orm/pg-core';
import {
  USER_ROLES,
  LOCALES,
  MERCHANT_STATUSES,
  MEMBER_ROLES,
  STORE_STATUSES,
  BAG_CATEGORIES,
  BAG_INSTANCE_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  REFUND_REASONS,
  CREDIT_REASONS,
  PAYOUT_STATUSES,
  REVIEW_STATUSES,
  MODERATION_ENTITIES,
  MODERATION_STATUSES,
  REFERRAL_STATUSES,
  CAMPAIGN_TYPES,
  NOTIFICATION_TYPES,
  TRANSLATABLE_ENTITIES,
} from '@baraka/shared';

// Les valeurs proviennent de @baraka/shared → source unique de vérité domaine ⇄ BDD.
export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const localeEnum = pgEnum('locale', LOCALES);
export const merchantStatusEnum = pgEnum('merchant_status', MERCHANT_STATUSES);
export const memberRoleEnum = pgEnum('member_role', MEMBER_ROLES);
export const storeStatusEnum = pgEnum('store_status', STORE_STATUSES);
export const bagCategoryEnum = pgEnum('bag_category', BAG_CATEGORIES);
export const bagInstanceStatusEnum = pgEnum('bag_instance_status', BAG_INSTANCE_STATUSES);
export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);
export const paymentMethodEnum = pgEnum('payment_method', PAYMENT_METHODS);
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUSES);
export const refundStatusEnum = pgEnum('refund_status', REFUND_STATUSES);
export const refundReasonEnum = pgEnum('refund_reason', REFUND_REASONS);
export const creditReasonEnum = pgEnum('credit_reason', CREDIT_REASONS);
export const payoutStatusEnum = pgEnum('payout_status', PAYOUT_STATUSES);
export const reviewStatusEnum = pgEnum('review_status', REVIEW_STATUSES);
export const moderationEntityEnum = pgEnum('moderation_entity', MODERATION_ENTITIES);
export const moderationStatusEnum = pgEnum('moderation_status', MODERATION_STATUSES);
export const referralStatusEnum = pgEnum('referral_status', REFERRAL_STATUSES);
export const campaignTypeEnum = pgEnum('campaign_type', CAMPAIGN_TYPES);
export const notificationTypeEnum = pgEnum('notification_type', NOTIFICATION_TYPES);
export const translatableEntityEnum = pgEnum('translatable_entity', TRANSLATABLE_ENTITIES);
export const platformEnum = pgEnum('device_platform', ['ios', 'android', 'web']);
