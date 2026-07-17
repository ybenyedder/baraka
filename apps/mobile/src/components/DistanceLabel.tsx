import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { formatDistance } from '@baraka/shared';
import { AppText } from './ui/AppText';
import { colors } from '@/lib/theme';

/** Icône pin + distance formatée (« 850 m » / « 1.2 km »). */
export function DistanceLabel({ meters }: { meters: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <MapPin size={13} color={colors.muted} strokeWidth={2.2} />
      <AppText variant="caption" tone="muted">
        {formatDistance(meters)}
      </AppText>
    </View>
  );
}
