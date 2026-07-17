/**
 * Photos culinaires fictives (Unsplash) assignées de façon déterministe par
 * boutique, en attendant les vraies images des commerçants. Choisies par
 * catégorie pour rester crédibles. Partagé entre web et mobile.
 */
const BASE = 'https://images.unsplash.com/photo-';
const PARAMS = '?auto=format&fit=crop&w=600&q=60';

const PHOTOS: Record<string, string[]> = {
  bakery_pastry: [
    '1509440159596-0249088772ff',
    '1555507036-ab1f4038808a',
    '1608198093002-ad4e005484ec',
    '1568254183919-78a4f43a2877',
  ],
  meals: [
    '1546069901-ba9599a7e63c',
    '1504674900247-0877df9cc836',
    '1565299624946-b28f40a0ae38',
    '1512621776951-a57141f2eefd',
  ],
  cafe: ['1511920170033-f8396924c348', '1495474472287-4d71bcdd2085', '1509042239860-f550ce710b93'],
  groceries: [
    '1542838132-92c53300491e',
    '1610832958506-aa56368176cf',
    '1506617420156-8e4536971650',
  ],
  hotel_buffet: [
    '1555244162-803834f70033',
    '1414235077428-338989a2e8c0',
    '1504674900247-0877df9cc836',
  ],
  other: ['1546069901-ba9599a7e63c', '1504674900247-0877df9cc836'],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const FALLBACK_ID = '1546069901-ba9599a7e63c';

/** URL d'une photo fictive pour une (catégorie, graine) données. */
export function foodPhoto(category: string | null | undefined, seed: string): string {
  const list = PHOTOS[category ?? 'other'] ?? PHOTOS.other ?? [];
  const id = list.length > 0 ? list[hash(seed) % list.length] : undefined;
  return `${BASE}${id ?? FALLBACK_ID}${PARAMS}`;
}
