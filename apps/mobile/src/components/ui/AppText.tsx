import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fontFamily, type FontWeightKey } from '@/lib/theme';

type Variant =
  | 'displayXl' // grands titres d'écran (hero)
  | 'display' // titres de section
  | 'title' // titres de carte
  | 'subtitle'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'label'
  | 'price';

type Tone = 'pine' | 'ink' | 'muted' | 'white' | 'yellow' | 'danger';

const VARIANTS: Record<
  Variant,
  { weight: FontWeightKey; size: number; lineHeight: number; tone: Tone }
> = {
  displayXl: { weight: 'displayXb', size: 28, lineHeight: 34, tone: 'pine' },
  display: { weight: 'display', size: 21, lineHeight: 27, tone: 'pine' },
  title: { weight: 'display', size: 16, lineHeight: 21, tone: 'pine' },
  subtitle: { weight: 'semibold', size: 15, lineHeight: 20, tone: 'ink' },
  body: { weight: 'regular', size: 14, lineHeight: 20, tone: 'ink' },
  bodyBold: { weight: 'bold', size: 14, lineHeight: 20, tone: 'ink' },
  caption: { weight: 'regular', size: 12, lineHeight: 16, tone: 'muted' },
  label: { weight: 'semibold', size: 13, lineHeight: 18, tone: 'ink' },
  price: { weight: 'extrabold', size: 17, lineHeight: 22, tone: 'pine' },
};

const TONES: Record<Tone, string> = {
  pine: colors.pine,
  ink: colors.ink,
  muted: colors.muted,
  white: colors.white,
  yellow: colors.yellow,
  danger: '#dc2626',
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: FontWeightKey;
  /** Couleur libre (prioritaire sur `tone`). */
  color?: string;
}

/**
 * Texte de l'app : choisit la bonne famille (Baloo/Nunito, bascule arabe auto)
 * et la couleur via `tone`. Utilise `className` uniquement pour la mise en page
 * (marges, alignement) — la couleur passe par `tone`/`color` pour rester
 * déterministe face à NativeWind.
 */
export function AppText({ variant = 'body', tone, weight, color, style, ...rest }: AppTextProps) {
  const v = VARIANTS[variant];
  const resolved: TextStyle = {
    fontFamily: fontFamily(weight ?? v.weight),
    fontSize: v.size,
    lineHeight: v.lineHeight,
    color: color ?? TONES[tone ?? v.tone],
  };
  return <Text style={[resolved, style]} {...rest} />;
}
