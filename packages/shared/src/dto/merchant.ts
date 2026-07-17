import { z } from 'zod';
import {
  STORE_CATEGORIES,
  BAG_CATEGORIES,
  DIETARY_FLAGS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
} from '../enums';
import { CURRENCY_CODES } from '../money';

/** Candidature commerçant (crée un merchant en statut pending). */
export const zApplyMerchant = z.object({
  legalName: z.string().min(2).max(160),
  taxId: z.string().max(40).optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional(),
});
export type ApplyMerchant = z.infer<typeof zApplyMerchant>;

/** Création / mise à jour d'une boutique. */
export const zUpsertStore = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  category: z.enum(STORE_CATEGORIES).optional(),
  addressLine: z.string().min(3).max(200),
  city: z.string().min(1).max(80),
  governorate: z.string().max(80).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  openingHours: z.record(z.string()).optional(),
});
export type UpsertStore = z.infer<typeof zUpsertStore>;

/** Plafond des montants en unités mineures (10 000 unités majeures) : borne les colonnes
 *  int4 en base (prix × quantité ≤ ~10^8 < 2^31) et évite tout overflow au checkout. */
const MAX_MINOR = 10_000_000;

/** Modèle de panier. */
export const zUpsertBagTemplate = z
  .object({
    name: z.string().min(2).max(120),
    description: z.string().max(1000).optional(),
    bagCategory: z.enum(BAG_CATEGORIES).default('meal'),
    dietary: z.array(z.enum(DIETARY_FLAGS)).default([]),
    priceMinor: z.number().int().min(0).max(MAX_MINOR),
    originalValueMinor: z.number().int().min(0).max(MAX_MINOR),
    currency: z.enum(CURRENCY_CODES).default('TND'),
    active: z.boolean().default(true),
  })
  .refine((t) => t.priceMinor <= t.originalValueMinor, {
    message: 'Le prix de vente ne peut dépasser la valeur d’origine.',
    path: ['priceMinor'],
  });
export type UpsertBagTemplate = z.infer<typeof zUpsertBagTemplate>;

/** Ligne de planning hebdomadaire (weekday 0=dimanche..6=samedi, heure HH:MM 24 h). */
const zTimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (HH:MM).');
export const zUpsertSchedule = z
  .object({
    weekday: z.number().int().min(0).max(6),
    pickupStart: zTimeOfDay,
    pickupEnd: zTimeOfDay,
    quantity: z.number().int().min(0).max(500),
  })
  .refine((s) => s.pickupStart < s.pickupEnd, {
    // Comparaison lexicographique valide car HH:MM est zéro-paddé. Les créneaux passant
    // minuit ne sont pas supportés (ils rendraient l'instance jamais « live »).
    message: 'La fin du créneau doit être postérieure au début.',
    path: ['pickupEnd'],
  });
export type UpsertSchedule = z.infer<typeof zUpsertSchedule>;

/** Ajustement d'une instance du jour (quantité, ou annulation). */
export const zAdjustInstance = z.object({
  quantityTotal: z.number().int().min(0).max(10_000).optional(),
  cancel: z.boolean().optional(),
});
export type AdjustInstance = z.infer<typeof zAdjustInstance>;

/** Résumé statistique commerçant. */
export const zMerchantStats = z.object({
  revenueMinor: z.number().int(),
  currency: z.string(),
  bagsSold: z.number().int(),
  ordersCount: z.number().int(),
  ratingAvg: z.number().nullable(),
});
export type MerchantStats = z.infer<typeof zMerchantStats>;

/** Mise à jour du profil commerçant (la raison sociale et la commission restent gérées par l'admin). */
export const zUpdateMerchantProfile = z.object({
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).nullable().optional(),
  taxId: z.string().max(40).nullable().optional(),
  /** RIB/IBAN pour recevoir les versements. */
  payoutIban: z.string().max(40).nullable().optional(),
});
export type UpdateMerchantProfile = z.infer<typeof zUpdateMerchantProfile>;

/** Commande vue par le commerçant (jamais de pickupCode : le client le présente au comptoir). */
export const zMerchantOrder = z.object({
  id: z.string().uuid(),
  number: z.string(),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  quantity: z.number().int(),
  totalMinor: z.number().int(),
  currency: z.string(),
  customerName: z.string().nullable(),
  bagTitle: z.string(),
  storeId: z.string().uuid(),
  storeName: z.string(),
  pickupStartAt: z.string().nullable(),
  pickupEndAt: z.string().nullable(),
  createdAt: z.string(),
  pickedUpAt: z.string().nullable(),
});
export type MerchantOrder = z.infer<typeof zMerchantOrder>;

export const zMerchantOrdersQuery = z.object({
  storeId: z.string().uuid().optional(),
  /** today = retraits du jour ; all = historique. */
  scope: z.enum(['today', 'all']).default('today'),
  status: z.enum(ORDER_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type MerchantOrdersQuery = z.infer<typeof zMerchantOrdersQuery>;

/** Point quotidien de la série analytics (date au format YYYY-MM-DD). */
export const zMerchantAnalyticsPoint = z.object({
  date: z.string(),
  revenueMinor: z.number().int(),
  bagsSold: z.number().int(),
  ordersCount: z.number().int(),
});
export type MerchantAnalyticsPoint = z.infer<typeof zMerchantAnalyticsPoint>;

/** Analytics commerçant : série quotidienne + répartition par boutique. */
export const zMerchantAnalytics = z.object({
  days: z.number().int(),
  currency: z.string(),
  series: z.array(zMerchantAnalyticsPoint),
  totals: z.object({
    revenueMinor: z.number().int(),
    bagsSold: z.number().int(),
    ordersCount: z.number().int(),
    cancelledCount: z.number().int(),
    noShowCount: z.number().int(),
  }),
  byStore: z.array(
    z.object({
      storeId: z.string().uuid(),
      storeName: z.string(),
      revenueMinor: z.number().int(),
      bagsSold: z.number().int(),
    }),
  ),
});
export type MerchantAnalytics = z.infer<typeof zMerchantAnalytics>;
