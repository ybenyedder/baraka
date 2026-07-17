import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/store/session';
import { colors, fontFamily } from '@/lib/theme';

function icon(emoji: string) {
  function TabBarIcon({ color }: { color: string }) {
    return <Text style={{ color, fontSize: 20 }}>{emoji}</Text>;
  }
  return TabBarIcon;
}

export default function MerchantTabs() {
  const { t } = useTranslation('merchant');
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const isMerchant = useSession((s) => s.user?.isMerchant ?? false);

  // Garde d'accès : un deep link `baraka://today` ne doit pas ouvrir l'espace commerçant à un
  // client (ou un visiteur non connecté). L'API refuse déjà au submit, mais l'UI ne doit pas
  // s'afficher. (En mode dégradé hors-ligne, le profil peut manquer : on laisse passer si
  // authentifié, l'API reste l'autorité.)
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;
  if (useSession.getState().user && !isMerchant) return <Redirect href="/(customer)/(tabs)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.mutedSoft,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fontFamily('semibold'), fontSize: 11 },
      }}
    >
      <Tabs.Screen name="today" options={{ title: t('today.title'), tabBarIcon: icon('📦') }} />
      <Tabs.Screen
        name="listings"
        options={{ title: t('listings.title'), tabBarIcon: icon('🧺') }}
      />
      <Tabs.Screen name="stats" options={{ title: t('stats.revenue'), tabBarIcon: icon('📊') }} />
      <Tabs.Screen name="store" options={{ title: t('dashboard.title'), tabBarIcon: icon('🏪') }} />
    </Tabs>
  );
}
