import { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BagCard as BagCardData } from '@baraka/shared';
import { STORE_CATEGORIES } from '@baraka/shared';
import { api } from '@/lib/api';
import { useLocationStore } from '@/store/location';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { LocationHeader } from '@/components/LocationHeader';
import { SectionCarousel } from '@/components/SectionCarousel';
import { LocationSheet } from '@/components/LocationSheet';
import { colors } from '@/lib/theme';

const ENDING_SOON_MS = 3 * 60 * 60 * 1000; // paniers dont le retrait se termine dans < 3 h

export default function Discover() {
  const { t } = useTranslation('discovery');
  const router = useRouter();
  const { lat, lng, radiusM, label } = useLocationStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['nearby', lat, lng, radiusM],
    queryFn: () => api.nearby({ lat, lng, radius: radiusM, limit: 50 }),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const sections = useMemo(() => {
    const recommended = [...items]
      .filter((b) => b.ratingAvg != null)
      .sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0))
      .slice(0, 10);

    const now = Date.now();
    const endingSoon = items
      .filter((b) => {
        const end = new Date(b.pickupEndAt).getTime();
        return end > now && end - now < ENDING_SOON_MS;
      })
      .sort((a, b) => new Date(a.pickupEndAt).getTime() - new Date(b.pickupEndAt).getTime());

    const nearby = items.slice(0, 12);

    const byCategory = STORE_CATEGORIES.map((cat) => ({
      cat,
      bags: items.filter((b) => b.storeCategory === cat),
    })).filter((g) => g.bags.length > 0);

    return { recommended, endingSoon, nearby, byCategory };
  }, [items]);

  const openBag = (bag: BagCardData) => router.push(`/(customer)/store/${bag.storeSlug}`);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 14 }}>
        <LocationHeader
          label={label}
          radiusKm={Math.round(radiusM / 1000)}
          onPress={() => setSheetOpen(true)}
        />
        <SearchBar
          mode="button"
          placeholder={t('searchPlaceholder')}
          onPress={() => router.push('/(customer)/(tabs)/browse')}
        />
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          <Skeleton height={22} width="55%" />
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Skeleton height={230} width={264} radius={24} />
            <Skeleton height={230} width={110} radius={24} />
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.pine} />
          }
        >
          <SectionCarousel
            title={t('sections.recommended')}
            bags={sections.recommended}
            onPressBag={openBag}
          />
          <SectionCarousel
            title={t('sections.endingSoon')}
            bags={sections.endingSoon}
            onPressBag={openBag}
          />
          <SectionCarousel
            title={t('sections.nearby')}
            bags={sections.nearby}
            onPressBag={openBag}
          />
          {sections.byCategory.map((g) => (
            <SectionCarousel
              key={g.cat}
              title={t(`categories.${g.cat}`)}
              bags={g.bags}
              onPressBag={openBag}
            />
          ))}
        </ScrollView>
      )}

      <LocationSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </SafeAreaView>
  );
}
