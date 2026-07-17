import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

/** Conteneur d'écran avec fond de marque et safe area. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View className="flex-1 px-5 pt-2">{children}</View>
    </SafeAreaView>
  );
}
