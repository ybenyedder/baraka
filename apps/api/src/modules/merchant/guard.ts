import { and, eq } from 'drizzle-orm';
import { merchantMembers, merchants, stores } from '@baraka/db';
import { getDb } from '../../lib/db';
import { errors } from '../../lib/errors';
import type { MemberRole } from '@baraka/shared';

export interface MerchantContext {
  merchantId: string;
  role: MemberRole;
}

/** Récupère le merchant rattaché à l'utilisateur (ou null s'il n'est pas commerçant). */
export async function getMerchantForUser(userId: string): Promise<MerchantContext | null> {
  const membership = await getDb().query.merchantMembers.findFirst({
    where: eq(merchantMembers.userId, userId),
  });
  return membership ? { merchantId: membership.merchantId, role: membership.role } : null;
}

/** Comme ci-dessus mais lève 403 si l'utilisateur n'est pas commerçant. */
export async function requireMerchant(userId: string): Promise<MerchantContext> {
  const ctx = await getMerchantForUser(userId);
  if (!ctx) throw errors.forbidden('Compte commerçant requis.');
  return ctx;
}

/** Comme requireMerchant, mais exige en plus que le commerçant soit APPROUVÉ (publier/vendre). */
export async function requireApprovedMerchant(userId: string): Promise<MerchantContext> {
  const ctx = await requireMerchant(userId);
  const merchant = await getDb().query.merchants.findFirst({
    where: eq(merchants.id, ctx.merchantId),
  });
  if (!merchant || merchant.status !== 'approved') {
    throw errors.forbidden('Votre compte commerçant doit être approuvé pour publier ou vendre.');
  }
  return ctx;
}

/**
 * Comme requireMerchant, mais REFUSE un commerçant suspendu ou rejeté. À utiliser sur les
 * opérations (mutations catalogue, validation de retrait, création de boutique) : une
 * suspension doit couper l'activité, tout en laissant un 'pending' préparer son catalogue
 * avant approbation (onboarding).
 */
export async function requireActiveMerchant(userId: string): Promise<MerchantContext> {
  const ctx = await requireMerchant(userId);
  const merchant = await getDb().query.merchants.findFirst({
    where: eq(merchants.id, ctx.merchantId),
  });
  if (!merchant || merchant.status === 'suspended' || merchant.status === 'rejected') {
    throw errors.forbidden('Votre compte commerçant est suspendu : opération impossible.');
  }
  return ctx;
}

/** Vérifie qu'une boutique appartient bien au merchant de l'utilisateur (et qu'il n'est pas suspendu). */
export async function assertStoreOwnership(
  userId: string,
  storeId: string,
): Promise<MerchantContext> {
  const ctx = await requireActiveMerchant(userId);
  const store = await getDb().query.stores.findFirst({
    where: and(eq(stores.id, storeId), eq(stores.merchantId, ctx.merchantId)),
  });
  if (!store) throw errors.forbidden('Cette boutique ne vous appartient pas.');
  return ctx;
}
