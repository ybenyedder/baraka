import { useEffect, useMemo, useState } from 'react';
import { View, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, SearchX, List, Map as MapIcon, LocateFixed } from 'lucide-react-native';
import { STORE_CATEGORIES, DIETARY_FLAGS, type BagCard as BagCardData } from '@baraka/shared';
import { api } from '@/lib/api';
import { useLocationStore } from '@/store/location';
import { useLocation } from '@/hooks/useLocation';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { BagCard } from '@/components/BagCard';
import { BagsMap } from '@/components/BagsMap';
import { StoreMapCard } from '@/components/StoreMapCard';
import { colors } from '@/lib/theme';

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Browse() {
  const { t } = useTranslation('discovery');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const { lat, lng, radiusM } = useLocationStore();
  const { locate } = useLocation();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [dietary, setDietary] = useState<string[]>([]);
  const [pickupNow, setPickupNow] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<BagCardData | null>(null);
  const debouncedQuery = useDebounced(query);

  // Arrondi à la minute SUPÉRIEURE : sans ça, `new Date().toISOString()` change à chaque
  // render → la queryKey mute en continu → re-fetch en boucle infinie tant que le filtre est
  // actif. Arrondi, la clé reste stable ~1 min (au plus 1 refetch/min, données fraîches).
  const pickupBefore = pickupNow
    ? new Date(Math.ceil(Date.now() / 60_000) * 60_000).toISOString()
    : undefined;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['browse', lat, lng, radiusM, category, dietary, pickupBefore, debouncedQuery],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) =>
        api.nearby({
          lat,
          lng,
          radius: radiusM,
          limit: 20,
          category: category ?? undefined,
          dietary: dietary.length ? dietary : undefined,
          pickupBefore,
          q: debouncedQuery.trim() || undefined,
          cursor: pageParam,
        }),
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const toggleDietary = (d: string) =>
    setDietary((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const openBag = (bag: BagCardData) => router.push(`/(customer)/store/${bag.storeSlug}`);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={tc('browse.searchPlaceholder')}
            />
          </View>
          <IconButton
            icon={view === 'list' ? MapIcon : List}
            tone="pine"
            onPress={() => {
              setSelected(null);
              setView((v) => (v === 'list' ? 'map' : 'list'));
            }}
            accessibilityLabel={view === 'list' ? t('viewMap') : t('viewList')}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          <Chip
            label={tc('browse.filters.all')}
            selected={category === null}
            onPress={() => setCategory(null)}
          />
          {STORE_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={t(`categories.${c}`)}
              selected={category === c}
              onPress={() => setCategory(category === c ? null : c)}
            />
          ))}
          <Chip
            icon={Clock}
            label={t('pickupNow')}
            selected={pickupNow}
            onPress={() => setPickupNow((v) => !v)}
          />
          {DIETARY_FLAGS.map((d) => (
            <Chip
              key={d}
              label={t(`dietary.${d}`)}
              selected={dietary.includes(d)}
              onPress={() => toggleDietary(d)}
            />
          ))}
        </ScrollView>
      </View>

      {view === 'map' ? (
        <View style={{ flex: 1 }}>
          <BagsMap
            bags={items}
            center={{ lat, lng }}
            selectedId={selected?.bagInstanceId}
            onSelectBag={setSelected}
            style={{ flex: 1 }}
          />
          <View style={{ position: 'absolute', top: 12, right: 16 }}>
            <IconButton icon={LocateFixed} tone="light" onPress={() => void locate()} />
          </View>
          {selected ? (
            <View style={{ position: 'absolute', left: 16, right: 16, bottom: 20 }}>
              <StoreMapCard
                bag={selected}
                onPress={() => openBag(selected)}
                onClose={() => setSelected(null)}
              />
            </View>
          ) : null}
        </View>
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.pine} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.bagInstanceId}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          ListEmptyComponent={<EmptyState icon={SearchX} title={tc('browse.empty')} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.pine} style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <BagCard bag={item} layout="full" onPress={() => openBag(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}
