import { Pressable, ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, radii } from '@/lib/theme';

type Variant = 'yellow' | 'pine' | 'outline' | 'outline-light' | 'ghost';
type Size = 'md' | 'lg';

export interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BG: Record<Variant, string> = {
  yellow: colors.yellow,
  pine: colors.pine,
  outline: 'transparent',
  'outline-light': 'transparent',
  ghost: 'transparent',
};
const FG: Record<Variant, string> = {
  yellow: colors.pine,
  pine: colors.white,
  outline: colors.pine,
  'outline-light': colors.cream,
  ghost: colors.pine,
};
const BORDER: Record<Variant, string> = {
  yellow: colors.yellow,
  pine: colors.pine,
  outline: colors.pine,
  'outline-light': colors.cream,
  ghost: 'transparent',
};

/** CTA principal façon TGTG : pilule jaune texte pine (variant par défaut). */
export function PrimaryButton({
  label,
  onPress,
  variant = 'yellow',
  size = 'lg',
  loading = false,
  disabled = false,
  icon: Icon,
  fullWidth = true,
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const pad = size === 'lg' ? 16 : 12;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: pad,
          paddingHorizontal: 20,
          borderRadius: radii.pill,
          backgroundColor: BG[variant],
          borderWidth: variant === 'outline' || variant === 'outline-light' ? 1.5 : 0,
          borderColor: BORDER[variant],
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <>
          {Icon ? (
            <View>
              <Icon size={18} color={FG[variant]} strokeWidth={2.4} />
            </View>
          ) : null}
          <AppText variant="subtitle" weight="extrabold" color={FG[variant]}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}
