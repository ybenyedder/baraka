import { Stack } from 'expo-router';
import { colors, fontFamily } from '@/lib/theme';

export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.pine,
        headerTitleStyle: { fontFamily: fontFamily('display'), color: colors.pine },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      {/* Le hero pleine largeur remplace le header sur la fiche commerce. */}
      <Stack.Screen name="store/[slug]" options={{ headerShown: false }} />
      <Stack.Screen
        name="checkout/[bagInstanceId]"
        options={{ headerShown: true, title: '', presentation: 'modal' }}
      />
      <Stack.Screen name="order/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen
        name="review/[orderId]"
        options={{ headerShown: true, title: '', presentation: 'modal' }}
      />
    </Stack>
  );
}
