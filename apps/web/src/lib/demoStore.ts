import type { StoreDetail } from '@baraka/shared';

/**
 * Boutique de démonstration affichée quand l'API backend est injoignable
 * (revue de design en local sans serveur). En production, la page boutique
 * reflète l'état réel renvoyé par l'API — cette donnée n'est jamais utilisée.
 */
export function demoStoreDetail(slug: string): StoreDetail {
  const bag = (
    id: string,
    title: string,
    priceMinor: number,
    originalMinor: number,
    qty: number,
  ) => ({
    bagInstanceId: id,
    storeId: 'demo-store',
    storeSlug: slug,
    storeName: 'Boulangerie El Baraka',
    storeCategory: 'bakery_pastry' as const,
    bagCategory: 'bakery' as const,
    title,
    imageUrl: null,
    price: { amountMinor: priceMinor, currency: 'TND' as const },
    originalValue: { amountMinor: originalMinor, currency: 'TND' as const },
    lat: 36.8008,
    lng: 10.1815,
    dietary: ['vegetarian' as const],
    quantityAvailable: qty,
    pickupStartAt: '2026-07-04T17:00:00.000Z',
    pickupEndAt: '2026-07-04T19:00:00.000Z',
    distanceMeters: 850,
    ratingAvg: 4.7,
    ratingCount: 128,
  });

  return {
    id: 'demo-store',
    slug,
    name: 'Boulangerie El Baraka',
    description:
      'Pains, viennoiseries et pâtisseries fraîches sauvés chaque soir. (Boutique de démonstration — l’API n’est pas connectée en local.)',
    category: 'bakery_pastry',
    coverImageUrl: null,
    logoUrl: null,
    addressLine: '12 Avenue Habib Bourguiba',
    city: 'Tunis',
    governorate: 'Tunis',
    lat: 36.8008,
    lng: 10.1815,
    ratingAvg: 4.7,
    ratingCount: 128,
    openingHours: null,
    liveBags: [
      bag('demo-bag-1', 'Panier Surprise Boulangerie', 4500, 15000, 5),
      bag('demo-bag-2', 'Panier Viennoiseries', 6000, 18000, 3),
      bag('demo-bag-3', 'Panier Pâtisseries du jour', 7500, 22000, 2),
    ],
  };
}
