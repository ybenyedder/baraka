import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';

export default function Stats() {
  const { t } = useTranslation('merchant');
  const cards = [t('stats.revenue'), t('stats.bagsSaved'), t('stats.rating'), t('stats.payouts')];
  return (
    <Screen>
      <Text className="mb-3 text-2xl font-bold text-brand-ink">{t('stats.revenue')}</Text>
      <View className="flex-row flex-wrap gap-3">
        {cards.map((c) => (
          <View key={c} className="min-w-[45%] flex-1 rounded-2xl bg-white p-4 shadow-sm">
            <Text className="text-sm text-black/50">{c}</Text>
            <Text className="mt-1 text-2xl font-bold text-brand-ink">—</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
