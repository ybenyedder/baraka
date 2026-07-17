import { useMemo, useState } from 'react';
import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag } from 'lucide-react-native';
import { TERMINAL_ORDER_STATUSES } from '@baraka/shared';
import { api } from '@/lib/api';
import { useSession } from '@/store/session';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderCard } from '@/components/OrderCard';
import { colors } from '@/lib/theme';

type Tab = 'upcoming' | 'history';

export default function Orders() {
  const { t } = useTranslation('orders');
  const router = useRouter();
  const isAuth = useSession((s) => s.isAuthenticated);
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: api.listOrders,
    enabled: isAuth,
  });

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return all.filter((o) =>
      tab === 'history'
        ? TERMINAL_ORDER_STATUSES.includes(o.status)
        : !TERMINAL_ORDER_STATUSES.includes(o.status),
    );
  }, [data, tab]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 14 }}>
        <AppText variant="displayXl">{t('history')}</AppText>
        {/* Segmenté À venir / Historique */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.creamDeep,
            borderRadius: 999,
            padding: 4,
          }}
        >
          {(['upcoming', 'history'] as Tab[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: tab === key ? colors.white : 'transparent',
              }}
            >
              <AppText
                variant="label"
                weight="bold"
                color={tab === key ? colors.pine : colors.muted}
              >
                {t(key)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.pine} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={ShoppingBag}
              title={t(`empty.${tab}`)}
              actionLabel={tab === 'upcoming' ? t('discoverCta') : undefined}
              onAction={tab === 'upcoming' ? () => router.push('/(customer)/(tabs)') : undefined}
            />
          }
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => router.push(`/(customer)/order/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}
