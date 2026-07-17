import { Baloo_2, Baloo_Bhaijaan_2, Nunito } from 'next/font/google';

/**
 * Polices Baraka (look Too Good To Go).
 * Contrainte next/font : les loaders doivent être appelés au niveau module avec des
 * options constantes → on charge les trois inconditionnellement et on attache leurs
 * variables CSS à <html>. Le navigateur choisit la bonne fonte via unicode-range :
 * Baloo 2 / Nunito n'ont pas de glyphes arabes, donc l'arabe retombe automatiquement
 * sur Baloo Bhaijaan 2 (titres) puis Noto Sans Arabic (corps).
 */

/** Titres — arrondi et charnu (fonte variable 400–800). */
export const baloo = Baloo_2({ subsets: ['latin'], variable: '--font-baloo', display: 'swap' });

/** Corps de texte. */
export const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });

/** Variante Baloo à glyphes arabes — chargée à la demande (pas de preload sur fr/en). */
export const balooArabic = Baloo_Bhaijaan_2({
  subsets: ['arabic'],
  variable: '--font-baloo-arabic',
  display: 'swap',
  preload: false,
});
