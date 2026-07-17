import { z } from 'zod';
import { MERCHANT_STATUSES, REVIEW_STATUSES, CAMPAIGN_TYPES, MODERATION_STATUSES } from '../enums';

/** Décision d'approbation d'un commerçant. */
export const zApproveMerchant = z.object({
  status: z.enum(['approved', 'rejected', 'suspended']),
  commissionBps: z.number().int().min(0).max(10000).optional(),
  notes: z.string().max(1000).optional(),
});
export type ApproveMerchant = z.infer<typeof zApproveMerchant>;

export const zMerchantListItem = z.object({
  id: z.string().uuid(),
  legalName: z.string(),
  contactEmail: z.string(),
  status: z.enum(MERCHANT_STATUSES),
  createdAt: z.string().datetime(),
});
export type MerchantListItem = z.infer<typeof zMerchantListItem>;

/** Action de modération sur un avis. */
export const zModerateReview = z.object({
  status: z.enum(REVIEW_STATUSES),
});
export type ModerateReview = z.infer<typeof zModerateReview>;

export const zResolveReport = z.object({
  status: z.enum(MODERATION_STATUSES),
});
export type ResolveReport = z.infer<typeof zResolveReport>;

/** Création / mise à jour d'une campagne. */
export const zUpsertCampaign = z.object({
  type: z.enum(CAMPAIGN_TYPES),
  title: z.string().min(2).max(160),
  locale: z.enum(['fr', 'en', 'ar']).optional(),
  payload: z.record(z.unknown()).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
  sort: z.number().int().default(0),
});
export type UpsertCampaign = z.infer<typeof zUpsertCampaign>;

/** Tableau de bord admin global. */
export const zAdminStats = z.object({
  users: z.number().int(),
  merchants: z.number().int(),
  activeStores: z.number().int(),
  ordersToday: z.number().int(),
  gmvTodayMinor: z.number().int(),
  bagsSavedTotal: z.number().int(),
});
export type AdminStats = z.infer<typeof zAdminStats>;
