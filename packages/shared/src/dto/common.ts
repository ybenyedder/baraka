import { z } from 'zod';
import { CURRENCY_CODES } from '../money';
import { LOCALES } from '../enums';

/** UUID d'entité. */
export const zId = z.string().uuid();

/** Montant monétaire sérialisé (jamais de float côté logique). */
export const zMoney = z.object({
  amountMinor: z.number().int(),
  currency: z.enum(CURRENCY_CODES),
});
export type MoneyDto = z.infer<typeof zMoney>;

/** Coordonnées géographiques (WGS84). */
export const zLatLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof zLatLng>;

export const zLocale = z.enum(LOCALES);

/** Pagination par curseur (scalable, stable sous insertion). */
export const zCursorPagination = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CursorPagination = z.infer<typeof zCursorPagination>;

export function zPaginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}

/** Enveloppe d'erreur standard de l'API. */
export const zApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof zApiError>;
