import { Tabs } from 'expo-router';
import { Compass, Search, Heart, ShoppingBag, CircleUser } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/lib/theme';

function tabIcon(Icon: LucideIcon) {
  function TabBarIcon({ color, focused }: { color: string; focused: boolean }) {
    return <Icon size={24} color={color} strokeWidth={focused ? 2.6 : 2} fill="none" />;
  }
  return TabBarIcon;
}

export default function CustomerTabs() {
  const { t } = useTranslation('common');
  // La barre système Android (gestes/boutons) recouvre une hauteur fixe → on
  // l'ajoute à la tab bar, sinon les onglets deviennent inaccessibles.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.mutedSoft,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: fontFamily('semibold'), fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.discover'), tabBarIcon: tabIcon(Compass) }}
      />
      <Tabs.Screen
        name="browse"
        options={{ title: t('nav.browse'), tabBarIcon: tabIcon(Search) }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: t('nav.favorites'), tabBarIcon: tabIcon(Heart) }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: t('nav.orders'), tabBarIcon: tabIcon(ShoppingBag) }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('nav.profile'), tabBarIcon: tabIcon(CircleUser) }}
      />
    </Tabs>
  );
}
