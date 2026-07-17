import { Pressable, View } from 'react-native';
import { MapPin, ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './ui/AppText';
import { colors } from '@/lib/theme';

/** En-tête « position + rayon » cliquable (ouvre le sélecteur de localisation). */
export function LocationHeader({
  label,
  radiusKm,
  onPress,
}: {
  label: string;
  radiusKm: number;
  onPress: () => void;
}) {
  const { t } = useTranslation('common');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexShrink: 1 }}>
      <AppText variant="caption" tone="muted">
        {t('nav.discover')}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MapPin size={17} color={colors.pine} strokeWidth={2.4} />
        <AppText variant="title" numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="caption" tone="muted">
          · {radiusKm} km
        </AppText>
        <ChevronDown size={16} color={colors.pine} strokeWidth={2.6} />
      </View>
    </Pressable>
  );
}
