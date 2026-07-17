import { Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors } from '@/lib/theme';

/** Chip de filtre sélectionnable (catégories, régimes, « récupérer maintenant »). */
export function Chip({
  label,
  selected = false,
  onPress,
  icon: Icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? colors.pine : colors.border,
        backgroundColor: selected ? colors.pine : colors.white,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {Icon ? (
        <View>
          <Icon size={15} color={selected ? colors.white : colors.pine} strokeWidth={2.2} />
        </View>
      ) : null}
      <AppText variant="label" weight="semibold" color={selected ? colors.white : colors.pine}>
        {label}
      </AppText>
    </Pressable>
  );
}
