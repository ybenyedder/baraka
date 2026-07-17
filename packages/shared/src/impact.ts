/**
 * Calcul de l'impact environnemental.
 * Valeurs par défaut alignées sur les ordres de grandeur communément cités pour un
 * panier anti-gaspi. Surchargées en base via `app_settings` (co2e_per_bag_g, etc.).
 */

import type { Money } from './money';
import { subtract, clampToZero } from './money';

/** Émissions de CO₂e évitées, en grammes, par panier sauvé (défaut). */
export const DEFAULT_CO2E_PER_BAG_G = 2700;

/** Équivalent eau économisée (litres) par panier — indicatif, pour l'affichage. */
export const DEFAULT_WATER_PER_BAG_L = 810;

export interface ImpactSettings {
  co2ePerBagG: number;
}

export const DEFAULT_IMPACT_SETTINGS: ImpactSettings = {
  co2ePerBagG: DEFAULT_CO2E_PER_BAG_G,
};

export interface ImpactStats {
  bagsSaved: number;
  co2eSavedG: number;
  /** Économies réalisées (valeur d'origine − prix payé), cumulées. */
  moneySaved: Money | null;
}

/** CO₂e évité pour un nombre de paniers. */
export function co2eForBags(
  bagsSaved: number,
  settings: ImpactSettings = DEFAULT_IMPACT_SETTINGS,
): number {
  return Math.max(0, Math.round(bagsSaved)) * settings.co2ePerBagG;
}

/** Économie réalisée sur un panier : valeur d'origine − prix payé (plancher zéro). */
export function moneySavedOnBag(originalValue: Money, pricePaid: Money): Money {
  return clampToZero(subtract(originalValue, pricePaid));
}

/** Formate un poids de CO₂ (g) en chaîne lisible (g ou kg). */
export function formatCo2e(grams: number): { value: number; unit: 'g' | 'kg' } {
  if (grams >= 1000) {
    return { value: Math.round(grams / 100) / 10, unit: 'kg' };
  }
  return { value: Math.round(grams), unit: 'g' };
}
