/**
 * Money — l'argent, sans flottants.
 *
 * INVARIANT CRITIQUE : tout montant est un ENTIER en unités mineures + une devise.
 *   - TND (dinar tunisien) a un exposant de 3 → 12,500 TND = 12500 millimes.
 *   - EUR / USD ont un exposant de 2 → 12,50 € = 1250 centimes.
 * Konnect parle nativement en millimes ; Stripe (EUR) en centimes.
 * Ne JAMAIS manipuler des montants en flottants « majeurs » dans la logique métier.
 */

/** Codes devises supportés (tuple littéral → réutilisable par z.enum). */
export const CURRENCY_CODES = ['TND', 'EUR', 'USD'] as const;
export type Currency = (typeof CURRENCY_CODES)[number];

/** Nombre de décimales (exposant) de chaque devise selon ISO 4217. */
export const CURRENCY_EXPONENT: Record<Currency, number> = {
  TND: 3,
  EUR: 2,
  USD: 2,
};

export const SUPPORTED_CURRENCIES: readonly Currency[] = CURRENCY_CODES;

/** Un montant monétaire : entier en unités mineures + sa devise. */
export interface Money {
  /** Montant en unités mineures (millimes pour TND, centimes pour EUR). Entier. */
  readonly amountMinor: number;
  readonly currency: Currency;
}

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

function assertInteger(amountMinor: number): void {
  if (!Number.isInteger(amountMinor)) {
    throw new MoneyError(
      `Montant non entier : ${amountMinor}. Les montants doivent être des entiers en unités mineures.`,
    );
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(`Devises incompatibles : ${a.currency} vs ${b.currency}.`);
  }
}

/** Construit un Money à partir d'un montant déjà en unités mineures. */
export function money(amountMinor: number, currency: Currency): Money {
  assertInteger(amountMinor);
  return { amountMinor, currency };
}

/** Montant nul dans une devise. */
export function zero(currency: Currency): Money {
  return { amountMinor: 0, currency };
}

/**
 * Convertit une valeur « majeure » (ex : 12.5 pour 12,500 TND) en Money.
 * Arrondit au plus proche (banker-safe via Math.round sur l'entier obtenu).
 * À n'utiliser qu'aux frontières (saisie utilisateur, import), jamais dans la logique.
 */
export function fromMajor(value: number, currency: Currency): Money {
  const factor = 10 ** CURRENCY_EXPONENT[currency];
  return money(Math.round(value * factor), currency);
}

/** Valeur majeure (nombre à virgule) — UNIQUEMENT pour l'affichage / passerelles legacy. */
export function toMajor(m: Money): number {
  return m.amountMinor / 10 ** CURRENCY_EXPONENT[m.currency];
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

/** Somme d'une liste de montants (devise unique requise). */
export function sum(items: Money[], currency: Currency): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

/** Multiplie par une quantité entière (ex : prix unitaire × nombre de paniers). */
export function multiplyByQuantity(m: Money, quantity: number): Money {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new MoneyError(`Quantité invalide : ${quantity} (entier positif attendu).`);
  }
  return money(m.amountMinor * quantity, m.currency);
}

/**
 * Applique un taux en points de base (bps). 100 bps = 1 %.
 * Sert au calcul de commission plateforme. Arrondi au millime/centime le plus proche.
 */
export function applyBps(m: Money, bps: number): Money {
  if (!Number.isInteger(bps) || bps < 0) {
    throw new MoneyError(`bps invalide : ${bps} (entier positif attendu).`);
  }
  return money(Math.round((m.amountMinor * bps) / 10_000), m.currency);
}

/** Réduction : garantit un plancher à zéro (jamais de montant négatif à payer). */
export function clampToZero(m: Money): Money {
  return m.amountMinor < 0 ? zero(m.currency) : m;
}

export function isZero(m: Money): boolean {
  return m.amountMinor === 0;
}

export function isNegative(m: Money): boolean {
  return m.amountMinor < 0;
}

export function isPositive(m: Money): boolean {
  return m.amountMinor > 0;
}

/** -1 si a<b, 0 si égal, 1 si a>b. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amountMinor === b.amountMinor;
}

/** Valeur absolue. */
export function abs(m: Money): Money {
  return money(Math.abs(m.amountMinor), m.currency);
}

/**
 * Formate pour l'affichage selon la locale.
 * Chiffres occidentaux forcés (numberingSystem 'latn') — la Tunisie utilise les chiffres
 * arabes occidentaux même en arabe. Ex TND/fr-TN → « 12,500 DT ».
 */
export function formatMoney(m: Money, locale = 'fr-TN'): string {
  const exp = CURRENCY_EXPONENT[m.currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: m.currency,
    numberingSystem: 'latn',
    minimumFractionDigits: exp,
    maximumFractionDigits: exp,
  }).format(toMajor(m));
}

/** Sérialisation stable pour l'API / la BDD (jamais de float). */
export function serializeMoney(m: Money): { amountMinor: number; currency: Currency } {
  return { amountMinor: m.amountMinor, currency: m.currency };
}
