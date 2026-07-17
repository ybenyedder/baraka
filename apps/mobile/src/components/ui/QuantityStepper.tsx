import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors } from '@/lib/theme';

/** Sélecteur de quantité − N + (checkout). */
export function QuantityStepper({
  value,
  min = 1,
  max = 10,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  const btn = (disabled: boolean, onPress: () => void, Icon: typeof Minus) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.creamDeep,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon size={20} color={colors.pine} strokeWidth={2.6} />
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      {btn(value <= min, dec, Minus)}
      <AppText variant="display" tone="pine" style={{ minWidth: 24, textAlign: 'center' }}>
        {value}
      </AppText>
      {btn(value >= max, inc, Plus)}
    </View>
  );
}
