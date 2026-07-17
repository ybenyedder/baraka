import { customAlphabet } from 'nanoid';

// Code de retrait : 6 chiffres (facile à dicter au comptoir).
const digits = customAlphabet('0123456789', 6);

export function generatePickupCode(): string {
  return digits();
}

/**
 * Numéro de commande lisible : BRK-YYYY-XXXXXX.
 * L'année est passée explicitement (Date.now interdit dans certains contextes).
 */
export function formatOrderNumber(year: number, sequence: number): string {
  return `BRK-${year}-${String(sequence).padStart(6, '0')}`;
}

// Suffixe court pour clés d'idempotence de paiement.
const alnum = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 12);
export function generateIdempotencyKey(prefix: string): string {
  return `${prefix}_${alnum()}`;
}
