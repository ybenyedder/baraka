import { Pressable, View, I18nManager, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme';

type Tone = 'light' | 'dark' | 'ghost' | 'pine';

export interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  tone?: Tone;
  size?: number;
  iconSize?: number;
  /** Miroir horizontal en RTL (icônes directionnelles : retour, chevrons). */
  mirrorRTL?: boolean;
  fill?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const BG: Record<Tone, string> = {
  light: colors.white,
  dark: colors.overlay,
  ghost: 'transparent',
  pine: colors.pine,
};
const FG: Record<Tone, string> = {
  light: colors.pine,
  dark: colors.white,
  ghost: colors.pine,
  pine: colors.white,
};

/** Bouton icône circulaire (retour/cœur flottants, actions de header). */
export function IconButton({
  icon: Icon,
  onPress,
  tone = 'light',
  size = 40,
  iconSize = 20,
  mirrorRTL = false,
  fill = 'none',
  color,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BG[tone],
          opacity: pressed ? 0.7 : 1,
        },
        tone === 'light' && {
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        style,
      ]}
    >
      <View style={mirrorRTL && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
        <Icon size={iconSize} color={color ?? FG[tone]} strokeWidth={2.2} fill={fill} />
      </View>
    </Pressable>
  );
}
