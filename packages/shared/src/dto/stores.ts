import { z } from 'zod';
import { zMoney } from './common';
import { zBagCard } from './discovery';
import { STORE_CATEGORIES } from '../enums';

/** Détail public d'une boutique (page SSR + écran mobile). */
export const zStoreDetail = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.enum(STORE_CATEGORIES).nullable(),
  coverImageUrl: z.string().nullable(),
  logoUrl: z.string().nullable(),
  addressLine: z.string(),
  city: z.string(),
  governorate: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  ratingAvg: z.number().nullable(),
  ratingCount: z.number().int(),
  openingHours: z.record(z.string()).nullable(),
  /** Paniers « live » actuellement disponibles. */
  liveBags: z.array(zBagCard),
});
export type StoreDetail = z.infer<typeof zStoreDetail>;

/** Boutique favorite (liste de l'onglet Favoris). */
export const zFavoriteStore = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  city: z.string(),
  category: z.enum(STORE_CATEGORIES).nullable(),
  coverImageUrl: z.string().nullable(),
  ratingAvg: z.number().nullable(),
  ratingCount: z.number().int(),
});
export type FavoriteStore = z.infer<typeof zFavoriteStore>;

/** Résumé d'avis d'une boutique. */
export const zReviewSummary = z.object({
  ratingAvg: z.number().nullable(),
  ratingCount: z.number().int(),
  distribution: z.record(z.string(), z.number().int()),
});
export type ReviewSummary = z.infer<typeof zReviewSummary>;

export const zReviewItem = z.object({
  id: z.string().uuid(),
  authorName: z.string(),
  ratingOverall: z.number().int(),
  comment: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ReviewItem = z.infer<typeof zReviewItem>;

/** Création d'un avis (une seule fois par commande retirée). */
export const zCreateReview = z.object({
  ratingOverall: z.number().int().min(1).max(5),
  ratingFood: z.number().int().min(1).max(5).optional(),
  ratingQuantity: z.number().int().min(1).max(5).optional(),
  ratingService: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});
export type CreateReview = z.infer<typeof zCreateReview>;

/** Vue impact utilisateur. */
export const zUserImpact = z.object({
  bagsSaved: z.number().int(),
  co2eSavedG: z.number().int(),
  moneySaved: z.object({ amountMinor: z.number().int(), currency: z.string() }),
});
export type UserImpact = z.infer<typeof zUserImpact>;

/** Estimation d'économie affichée sur un panier. */
export const zSavings = z.object({
  price: zMoney,
  originalValue: zMoney,
  saved: zMoney,
});
export type Savings = z.infer<typeof zSavings>;
