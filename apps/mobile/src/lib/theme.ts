import { I18nManager } from 'react-native';

/**
 * Constantes de thème en JS — pour tout ce qui ne passe pas par les classes
 * NativeWind (tab bar, ActivityIndicator, StatusBar, MapLibre, icônes lucide).
 * Miroir de la palette Tailwind (apps/mobile/tailwind.config.js).
 */
export const colors = {
  pine: '#005248',
  pineSoft: '#0a6b5c',
  cream: '#fff7e9',
  creamDeep: '#faf1e2',
  yellow: '#ffc42d',
  ink: '#1a1a1a',
  white: '#ffffff',
  muted: '#6b7280',
  mutedSoft: '#9ca3af',
  danger: '#dc2626',
  border: 'rgba(0,0,0,0.08)',
  overlay: 'rgba(0,0,0,0.35)',
} as const;

export const radii = { sm: 12, md: 16, lg: 20, card: 24, pill: 999 } as const;

/** Familles de police latines (nom = clé exportée par @expo-google-fonts). */
const LATIN = {
  display: 'Baloo2_700Bold',
  displaySemi: 'Baloo2_600SemiBold',
  displayXb: 'Baloo2_800ExtraBold',
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

/** Équivalents arabes (Baloo 2 / Nunito ne couvrent pas les glyphes arabes). */
const ARABIC = {
  display: 'BalooBhaijaan2_700Bold',
  displaySemi: 'BalooBhaijaan2_600SemiBold',
  displayXb: 'BalooBhaijaan2_800ExtraBold',
  regular: 'NotoSansArabic_400Regular',
  semibold: 'NotoSansArabic_600SemiBold',
  bold: 'NotoSansArabic_700Bold',
  extrabold: 'NotoSansArabic_800ExtraBold',
} as const;

export type FontWeightKey = keyof typeof LATIN;

/**
 * Nom de famille de police pour une graisse donnée, avec bascule arabe.
 * Seul l'arabe est RTL dans l'app → `I18nManager.isRTL` suffit comme défaut.
 */
export function fontFamily(weight: FontWeightKey, arabic: boolean = I18nManager.isRTL): string {
  return (arabic ? ARABIC : LATIN)[weight];
}
