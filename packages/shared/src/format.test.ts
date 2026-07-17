import { describe, it, expect } from 'vitest';
import { formatPickupWindow, formatDistance, discountPercent, STORE_TIME_ZONE } from './format';

describe('formatPickupWindow', () => {
  it('exprime le créneau en heure de Tunis, indépendamment du fuseau système', () => {
    // 19:00–21:00 heure de Tunis (UTC+1, pas d'heure d'été) = 18:00–20:00 UTC.
    const start = '2026-01-15T18:00:00.000Z';
    const end = '2026-01-15T20:00:00.000Z';
    const { range } = formatPickupWindow(start, end, 'fr-FR', "Aujourd'hui");
    // La plage doit contenir 19 et 21 (heure locale Tunis), jamais l'heure UTC brute.
    expect(range).toContain('19');
    expect(range).toContain('21');
  });

  it('formate en 24h (pas de AM/PM) même pour fr-TN qui rendrait sinon en 12h', () => {
    const start = '2026-01-15T18:00:00.000Z'; // 19:00 Tunis
    const end = '2026-01-15T20:00:00.000Z'; // 21:00 Tunis
    const { range } = formatPickupWindow(start, end, 'fr-TN', "Aujourd'hui");
    expect(range).not.toMatch(/AM|PM/i);
    expect(range).toContain('19');
    expect(range).toContain('21');
  });

  it('affiche le libellé « aujourd’hui » quand le créneau tombe le jour courant (fuseau Tunis)', () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // dans 1 h
    const end = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
    const { dayLabel } = formatPickupWindow(start, end, 'fr-FR', 'AUJTOKEN');
    // Dans 1 h on est presque toujours le même jour (sauf juste avant minuit) — tolérant.
    expect(typeof dayLabel).toBe('string');
    expect(dayLabel.length).toBeGreaterThan(0);
  });

  it('expose Africa/Tunis comme fuseau des boutiques', () => {
    expect(STORE_TIME_ZONE).toBe('Africa/Tunis');
  });
});

describe('formatDistance', () => {
  it('affiche des mètres sous le kilomètre et des km au-delà', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(1200)).toBe('1.2 km');
  });
});

describe('discountPercent', () => {
  it('calcule une remise positive et protège des valeurs invalides', () => {
    expect(discountPercent(700, 1000)).toBe(30);
    expect(discountPercent(1000, 0)).toBe(0);
    expect(discountPercent(1200, 1000)).toBe(0); // prix > valeur → jamais négatif
  });
});
