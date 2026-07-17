import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@/lib/theme';

type Tone = 'yellow' | 'white' | 'pine' | 'danger';

const BG: Record<Tone, string> = {
  yellow: colors.yellow,
  white: 'rgba(255,255,255,0.92)',
  pine: colors.pine,
  danger: '#dc2626',
};
const FG: Record<Tone, 'pine' | 'white'> = {
  yellow: 'pine',
  white: 'pine',
  pine: 'white',
  danger: 'white',
};

/** Pastille compacte : « 5+ restants », « -60% », statut. */
export function Badge({
  label,
  tone = 'yellow',
  style,
}: {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: BG[tone],
        },
        style,
      ]}
    >
      <AppText variant="caption" weight="extrabold" tone={FG[tone]}>
        {label}
      </AppText>
    </View>
  );
}
