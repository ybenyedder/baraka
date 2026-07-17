import type { BagCard, NearbyResponse, StoreDetail } from '@baraka/shared';

// SSR : appelle l'API en interne (même conteneur) pour ne pas dépendre de l'URL
// publique. Le navigateur, lui, utilise des chemins relatifs proxifiés (voir
// next.config `rewrites` + `NEXT_PUBLIC_API_URL` vide) → app mono-origine.
const API_URL =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Rejette après `ms` — utilisé pour ne pas bloquer le SSR si l'API traîne. */
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('api-timeout')), ms));
}

/** Récupère le détail d'une boutique côté serveur (SSR). null si absente/injoignable/lente. */
export async function fetchStoreDetail(slug: string): Promise<StoreDetail | null> {
  try {
    // Course contre un minuteur : le fetch patché de Next n'honore pas toujours
    // AbortSignal, donc on borne le temps d'attente côté application.
    const res = await Promise.race([
      fetch(`${API_URL}/v1/discovery/stores/${encodeURIComponent(slug)}`, {
        next: { revalidate: 60 }, // Revalidation ISR : rafraîchit la page toutes les 60 s.
      }),
      timeout(1500),
    ]);
    if (!res.ok) return null;
    return (await res.json()) as StoreDetail;
  } catch {
    return null;
  }
}

/** Liste les paniers surprise « live » près d'un point (feed de recherche). */
export async function fetchNearbyBags(params: {
  lat: number;
  lng: number;
  radius?: number;
  category?: string;
  q?: string;
  limit?: number;
}): Promise<BagCard[]> {
  const qs = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius: String(params.radius ?? 20000),
    // L'API plafonne limit à 50.
    limit: String(Math.min(params.limit ?? 50, 50)),
  });
  if (params.category) qs.set('category', params.category);
  if (params.q) qs.set('q', params.q);
  try {
    const res = await Promise.race([
      fetch(`${API_URL}/v1/discovery/stores/nearby?${qs.toString()}`, { cache: 'no-store' }),
      timeout(2500),
    ]);
    if (!res.ok) return [];
    return ((await res.json()) as NearbyResponse).items;
  } catch {
    return [];
  }
}
