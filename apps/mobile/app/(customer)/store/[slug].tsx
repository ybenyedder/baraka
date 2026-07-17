import { View, ScrollView, Pressable, ActivityIndicator, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { foodPhoto, type BagCard as BagCardData } from '@baraka/shared';
import { api, mediaUrl } from '@/lib/api';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { RatingStars } from '@/components/ui/RatingStars';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StoreAvatar } from '@/components/StoreAvatar';
import { BagsMap } from '@/components/BagsMap';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PickupWindow } from '@/components/PickupWindow';
import { PriceTag } from '@/components/PriceTag';
import { colors, radii } from '@/lib/theme';

const HERO_HEIGHT = 250;

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { t } = useTranslation('discovery');
  const { t: tc } = useTranslation('common');
  const insets = useSafeAreaInsets();

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => api.storeDetail(String(slug)),
    enabled: Boolean(slug),
  });

  if (isLoading || !store) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.pine} />
      </View>
    );
  }

  const cover = mediaUrl(store.coverImageUrl) ?? foodPhoto(store.category, store.slug);
  const firstBag = store.liveBags[0];

  const goCheckout = (bag: BagCardData) =>
    router.push({
      pathname: '/(customer)/checkout/[bagInstanceId]',
      params: {
        bagInstanceId: bag.bagInstanceId,
        title: bag.title,
        storeName: store.name,
        priceMinor: String(bag.price.amountMinor),
        originalMinor: String(bag.originalValue.amountMinor),
        currency: bag.price.currency,
        quantityAvailable: String(bag.quantityAvailable),
        pickupStartAt: bag.pickupStartAt,
        pickupEndAt: bag.pickupEndAt,
        imageUrl: mediaUrl(bag.imageUrl) ?? '',
      },
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero */}
        <View style={{ height: HERO_HEIGHT }}>
          <Image
            source={cover}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="disk"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.15)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              position: 'absolute',
              top: insets.top + 6,
              left: 16,
              right: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <IconButton icon={ArrowLeft} tone="light" mirrorRTL onPress={() => router.back()} />
            <FavoriteButton storeId={store.id} tone="light" />
          </View>
          <View style={{ position: 'absolute', bottom: -28, left: 20 }}>
            <StoreAvatar name={store.name} logoUrl={store.logoUrl} size={64} bordered />
          </View>
        </View>

        {/* En-tête boutique */}
        <View style={{ paddingHorizontal: 20, paddingTop: 38 }}>
          <AppText variant="displayXl">{store.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <RatingStars rating={store.ratingAvg} size={16} />
            <AppText variant="caption" tone="muted">
              {t('reviews', { count: store.ratingCount })}
            </AppText>
          </View>
          <AppText variant="body" tone="muted" style={{ marginTop: 4 }}>
            {store.addressLine}, {store.city}
          </AppText>

          {/* Paniers surprise */}
          <AppText variant="display" style={{ marginTop: 24, marginBottom: 12 }}>
            {t('title')}
          </AppText>
          {store.liveBags.length === 0 ? (
            <AppText variant="body" tone="muted">
              {t('empty')}
            </AppText>
          ) : (
            <View style={{ gap: 12 }}>
              {store.liveBags.map((bag) => (
                <Pressable
                  key={bag.bagInstanceId}
                  onPress={() => goCheckout(bag)}
                  style={{
                    borderRadius: radii.card,
                    backgroundColor: colors.white,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <AppText variant="title" style={{ flex: 1 }}>
                      {bag.title}
                    </AppText>
                    <Badge
                      label={tc('browse.left', { count: bag.quantityAvailable })}
                      tone="yellow"
                    />
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <PickupWindow startAt={bag.pickupStartAt} endAt={bag.pickupEndAt} tone="pine" />
                  </View>
                  {bag.dietary.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {bag.dietary.map((d) => (
                        <View
                          key={d}
                          style={{
                            backgroundColor: colors.creamDeep,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 999,
                          }}
                        >
                          <AppText variant="caption" tone="pine">
                            {t(`dietary.${d}`)}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={{ marginTop: 12 }}>
                    <PriceTag price={bag.price} originalValue={bag.originalValue} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Description */}
          {store.description ? (
            <>
              <AppText variant="display" style={{ marginTop: 28, marginBottom: 8 }}>
                {t('expectTitle')}
              </AppText>
              <AppText variant="body" tone="muted" style={{ lineHeight: 21 }}>
                {store.description}
              </AppText>
            </>
          ) : null}

          {/* Adresse */}
          <AppText variant="display" style={{ marginTop: 28, marginBottom: 8 }}>
            {t('addressTitle')}
          </AppText>
          <View style={{ height: 150, borderRadius: radii.card, overflow: 'hidden' }}>
            <BagsMap
              bags={store.liveBags}
              center={{ lat: store.lat, lng: store.lng }}
              interactive={false}
              zoom={14}
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={() => {
                // `geo:` n'existe pas sur iOS (la promesse rejette en silence). On ouvre
                // l'app Plans native par plateforme, avec repli web universel si échec.
                const label = encodeURIComponent(store.name);
                const nativeUrl =
                  Platform.OS === 'ios'
                    ? `maps:0,0?q=${label}@${store.lat},${store.lng}`
                    : `geo:${store.lat},${store.lng}?q=${store.lat},${store.lng}(${label})`;
                Linking.openURL(nativeUrl).catch(() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`,
                  ).catch(() => undefined),
                );
              }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </View>
          <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>
            {store.addressLine}, {store.city}
          </AppText>
        </View>
      </ScrollView>

      {/* CTA sticky — marge basse garantie même sans inset système (nav 3 boutons). */}
      {firstBag ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.cream,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <PrimaryButton label={tc('actions.reserve')} onPress={() => goCheckout(firstBag)} />
        </View>
      ) : null}
    </View>
  );
}
