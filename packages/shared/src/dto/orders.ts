import { z } from 'zod';
import { zMoney } from './common';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../enums';

/** Création d'une réservation. */
export const zCreateOrderInput = z.object({
  bagInstanceId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
  paymentMethod: z.enum(PAYMENT_METHODS),
  /** Crédits à utiliser (en unités mineures), optionnel. */
  useCreditMinor: z.number().int().min(0).optional(),
});
export type CreateOrderInput = z.infer<typeof zCreateOrderInput>;

export const zOrder = z.object({
  id: z.string().uuid(),
  number: z.string(),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  quantity: z.number().int(),
  unitPrice: zMoney,
  total: zMoney,
  creditApplied: zMoney,
  pickupCode: z.string().nullable(),
  storeId: z.string().uuid(),
  storeSlug: z.string(),
  storeName: z.string(),
  bagTitle: z.string(),
  imageUrl: z.string().nullable(),
  pickupStartAt: z.string().datetime(),
  pickupEndAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  /** Présent seulement si un règlement en ligne est requis. */
  payment: z
    .object({
      kind: z.enum(['none', 'redirect', 'client_secret']),
      redirectUrl: z.string().url().optional(),
      clientSecret: z.string().optional(),
      expiresAt: z.string().datetime().optional(),
    })
    .optional(),
});
export type Order = z.infer<typeof zOrder>;

export const zCancelOrderInput = z.object({
  reason: z.string().max(280).optional(),
});
export type CancelOrderInput = z.infer<typeof zCancelOrderInput>;

/** Validation du retrait côté commerçant (saisie du code). */
export const zValidatePickupInput = z.object({
  pickupCode: z.string().length(6),
});
export type ValidatePickupInput = z.infer<typeof zValidatePickupInput>;
