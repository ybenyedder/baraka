import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { foodPhoto } from '@baraka/shared';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RatingStars } from '@/components/ui/RatingStars';
import { FavoriteButton } from '@/components/FavoriteButton';
import { useFavorites } from '@/hooks/useFavorites';
import { useSession } from '@/store/session';
import { mediaUrl } from '@/lib/api';
import { colors, radii } from '@/lib/theme';

export default function Favorites() {
  const { t } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const router = useRouter();
  const isAuth = useSession((s) => s.isAuthenticated);
  const { items, isLoading } = useFavorites();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}>
        <AppText variant="displayXl">{t('nav.favorites')}</AppText>
      </View>

      {!isAuth ? (
        /* État invité : CTA connexion (browse-first). */
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
          <EmptyState
            icon={Heart}
            title={ta('guest.signInTitle')}
            subtitle={ta('guest.signInText')}
          />
          <View style={{ marginTop: 8 }}>
            <PrimaryButton
              label={ta('login.submit')}
              onPress={() => router.push('/(auth)/login')}
            />
          </View>
        </View>
      ) : isAuth && isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.pine} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={Heart}
              title={t('favorites.emptyTitle')}
              subtitle={t('favorites.emptySubtitle')}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(customer)/store/${item.slug}`)}
              style={{
                borderRadius: radii.card,
                backgroundColor: colors.white,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              <View style={{ height: 128 }}>
                <Image
                  source={mediaUrl(item.coverImageUrl) ?? foodPhoto(item.category, item.slug)}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy="disk"
                />
                <View style={{ position: 'absolute', top: 8, right: 8 }}>
                  <FavoriteButton storeId={item.id} size={34} />
                </View>
              </View>
              <View style={{ padding: 14, gap: 4 }}>
                <AppText variant="title" numberOfLines={1}>
                  {item.name}
                </AppText>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <AppText variant="body" tone="muted">
                    {item.city}
                  </AppText>
                  <RatingStars rating={item.ratingAvg} count={item.ratingCount} />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
