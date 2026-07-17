import { env } from '../config/env';

/**
 * Géocodage d'adresse via Nominatim (OSM). Usage parcimonieux (≤ 1 req/s) :
 * appelé une seule fois à la création d'une boutique, en secours si le commerçant
 * n'a pas placé le point sur la carte lui-même.
 */
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org'}/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Baraka/1.0 (anti-gaspi Tunisie)' },
      // Timeout dur : un Nominatim lent ne doit pas faire pendre la requête indéfiniment (L8).
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
  } catch {
    return null;
  }
}
