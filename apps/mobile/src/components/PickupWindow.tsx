import { View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { formatPickupWindow } from '@baraka/shared';
import { AppText } from './ui/AppText';
import { useLocale } from '@/hooks/useLocale';
import { colors } from '@/lib/theme';

/** Icône horloge + fenêtre de retrait (« Aujourd'hui 19:00–21:00 »). */
export function PickupWindow({
  startAt,
  endAt,
  tone = 'muted',
}: {
  startAt: string;
  endAt: string;
  tone?: 'muted' | 'pine';
}) {
  const { t } = useTranslation('common');
  const { bcp47 } = useLocale();
  const { dayLabel, range } = formatPickupWindow(startAt, endAt, bcp47, t('browse.today'));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Clock size={13} color={tone === 'pine' ? colors.pine : colors.muted} strokeWidth={2.2} />
      <AppText variant="caption" tone={tone} weight={tone === 'pine' ? 'semibold' : 'regular'}>
        {dayLabel} {range}
      </AppText>
    </View>
  );
}
