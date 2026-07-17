import { z } from 'zod';
import { LOCALES } from '../enums';

/** E-mail normalisé (trim + minuscules) : garantit une unicité insensible à la casse
 *  et évite les comptes dupliqués « Amine@x.com » vs « amine@x.com ». */
const zEmail = z
  .string()
  .email()
  .transform((s) => s.trim().toLowerCase());

export const zRegisterInput = z.object({
  email: zEmail,
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  locale: z.enum(LOCALES).default('fr'),
  /** Code de parrainage éventuel (deep link /r/[code]). */
  referralCode: z.string().min(4).max(16).optional(),
});
export type RegisterInput = z.infer<typeof zRegisterInput>;

export const zLoginInput = z.object({
  email: zEmail,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof zLoginInput>;

export const zSessionUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['customer', 'merchant', 'admin']),
  locale: z.enum(LOCALES),
  referralCode: z.string(),
  isMerchant: z.boolean(),
});
export type SessionUser = z.infer<typeof zSessionUser>;

/** Enregistrement d'un device pour les push Expo. */
export const zRegisterDeviceInput = z.object({
  // Format Expo attendu (`ExponentPushToken[...]`) : rejette les tokens malformés/injectés (L2).
  expoPushToken: z
    .string()
    .min(1)
    .max(200)
    .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, 'Token push Expo invalide.'),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().optional(),
  locale: z.enum(LOCALES).optional(),
});
export type RegisterDeviceInput = z.infer<typeof zRegisterDeviceInput>;
