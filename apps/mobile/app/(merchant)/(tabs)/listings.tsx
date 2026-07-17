import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';

export default function Listings() {
  const { t } = useTranslation('merchant');
  return (
    <Screen>
      <Text className="mb-3 text-2xl font-bold text-brand-ink">{t('listings.title')}</Text>
      <View className="flex-1 items-center justify-center">
        <Text className="text-black/50">{t('listings.create')}</Text>
      </View>
    </Screen>
  );
}
