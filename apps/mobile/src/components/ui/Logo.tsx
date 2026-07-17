import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from './AppText';
import { colors } from '@/lib/theme';

const BAG = 'M6.5 11.5h19l1.4 14.2a2.4 2.4 0 0 1-2.4 2.6H7.5a2.4 2.4 0 0 1-2.4-2.6z';

/** Logo Baraka : couffin jaune + wordmark. `tone` colore le trait et le texte. */
export function Logo({
  tone = 'pine',
  withWordmark = true,
  size = 28,
}: {
  tone?: 'pine' | 'cream';
  withWordmark?: boolean;
  size?: number;
}) {
  const stroke = tone === 'cream' ? colors.cream : colors.pine;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Path d={BAG} fill={colors.yellow} />
        <Path
          d="M11 12v-1.5a5 5 0 0 1 10 0V12"
          fill="none"
          stroke={stroke}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <Path d={BAG} fill="none" stroke={stroke} strokeWidth={1.6} />
      </Svg>
      {withWordmark ? (
        <AppText variant="displayXl" color={stroke}>
          Baraka
        </AppText>
      ) : null}
    </View>
  );
}
