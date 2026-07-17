import { z } from 'zod';
import { zMoney } from './common';
import { BAG_CATEGORIES, DIETARY_FLAGS, STORE_CATEGORIES } from '../enums';

/** Requête « paniers à proximité » — cœur de la découverte. */
export const zNearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  /** Rayon en mètres. */
  radius: z.coerce.number().int().min(100).max(50_000).default(5000),
  category: z.enum(STORE_CATEGORIES).optional(),
  dietary: z
    .union([z.enum(DIETARY_FLAGS), z.array(z.enum(DIETARY_FLAGS))])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])),
  /** Ne garder que les paniers récupérables avant cette heure (ISO). */
  pickupBefore: z.string().datetime().optional(),
  /** Recherche plein texte (nom boutique / description). */
  q: z.string().max(120).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type NearbyQuery = z.infer<typeof zNearbyQuery>;

/** Carte d'un panier « live » dans les résultats de découverte. */
export const zBagCard = z.object({
  bagInstanceId: z.string().uuid(),
  storeId: z.string().uuid(),
  storeSlug: z.string(),
  storeName: z.string(),
  storeCategory: z.enum(STORE_CATEGORIES),
  bagCategory: z.enum(BAG_CATEGORIES),
  title: z.string(),
  imageUrl: z.string().nullable(),
  price: zMoney,
  originalValue: zMoney,
  dietary: z.array(z.enum(DIETARY_FLAGS)),
  quantityAvailable: z.number().int(),
  pickupStartAt: z.string().datetime(),
  pickupEndAt: z.string().datetime(),
  lat: z.number(),
  lng: z.number(),
  distanceMeters: z.number(),
  ratingAvg: z.number().nullable(),
  ratingCount: z.number().int(),
});
export type BagCard = z.infer<typeof zBagCard>;

export const zNearbyResponse = z.object({
  items: z.array(zBagCard),
  nextCursor: z.string().nullable(),
});
export type NearbyResponse = z.infer<typeof zNearbyResponse>;
