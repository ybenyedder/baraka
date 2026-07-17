/**
 * Formatage d'affichage partagé web + mobile (distance, remise, fenêtre de
 * retrait). Logique extraite de la carte panier du web pour rester cohérente.
 * `Intl` est disponible côté Hermes (mobile) et Node/navigateur (web).
 */

/** Distance lisible : « 850 m » sous le km, « 1.2 km » au-delà. */
export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** Pourcentage de remise entier (0 si valeur d'origine invalide). */
export function discountPercent(priceMinor: number, originalMinor: number): number {
  if (originalMinor <= 0) return 0;
  const pct = Math.round((1 - priceMinor / originalMinor) * 100);
  return pct > 0 ? pct : 0;
}

/**
 * Fuseau des boutiques : les créneaux de retrait sont TOUJOURS exprimés en heure locale
 * tunisienne, quel que soit le fuseau de l'appareil/navigateur (un client resté sur
 * Europe/Paris verrait sinon un créneau 19:00–21:00 comme « 20:00–22:00 » → retard au retrait).
 */
export const STORE_TIME_ZONE = 'Africa/Tunis';

/** Jour (AAAA-MM-JJ) d'une date DANS le fuseau boutique, pour comparer « est-ce aujourd'hui ». */
function storeDayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Fenêtre de retrait décomposée : libellé du jour + plage horaire « 19:00–21:00 ». */
export function formatPickupWindow(
  startISO: string,
  endISO: string,
  bcp47: string,
  todayLabel: string,
): { dayLabel: string; range: string } {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const time = new Intl.DateTimeFormat(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    // 24h explicite : `fr-TN`/`en-US` afficheraient sinon « 12:00 PM » (l'usage tunisien est 24h).
    hour12: false,
    timeZone: STORE_TIME_ZONE,
  });
  const isToday = storeDayKey(start) === storeDayKey(new Date());
  const dayLabel = isToday
    ? todayLabel
    : new Intl.DateTimeFormat(bcp47, {
        weekday: 'short',
        day: 'numeric',
        timeZone: STORE_TIME_ZONE,
      }).format(start);
  return { dayLabel, range: `${time.format(start)}–${time.format(end)}` };
}
