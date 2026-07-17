import { View } from 'react-native';
import { Star } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors } from '@/lib/theme';

/** Note : étoile jaune remplie + valeur (et nombre d'avis optionnel). */
export function RatingStars({
  rating,
  count,
  size = 14,
}: {
  rating: number | null;
  count?: number;
  size?: number;
}) {
  if (rating == null) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Star size={size} color={colors.yellow} fill={colors.yellow} strokeWidth={0} />
      <AppText variant="caption" weight="bold" tone="pine">
        {rating.toFixed(1)}
        {count != null && count > 0 ? ` (${count})` : ''}
      </AppText>
    </View>
  );
}
