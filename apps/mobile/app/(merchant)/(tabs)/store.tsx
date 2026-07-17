import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { useSession } from '@/store/session';

export default function Store() {
  const { t } = useTranslation('merchant');
  const router = useRouter();
  const setMode = useSession((s) => s.setMode);

  return (
    <Screen>
      <Text className="mb-3 text-2xl font-bold text-brand-ink">{t('dashboard.title')}</Text>
      <View className="flex-1 justify-center">
        <Text className="text-center text-black/50">{t('onboarding.pending')}</Text>
      </View>
      <Pressable
        onPress={() => {
          setMode('customer');
          router.replace('/(customer)/(tabs)');
        }}
        className="mb-4 items-center rounded-xl border border-brand py-3"
      >
        <Text className="font-semibold text-brand">{t('dashboard.backToCustomer')}</Text>
      </Pressable>
    </Screen>
  );
}
