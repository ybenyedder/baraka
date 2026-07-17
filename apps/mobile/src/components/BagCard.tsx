import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { foodPhoto, type BagCard as BagCardData } from '@baraka/shared';
import { mediaUrl } from '@/lib/api';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';
import { RatingStars } from './ui/RatingStars';
import { StoreAvatar } from './StoreAvatar';
import { FavoriteButton } from './FavoriteButton';
import { PickupWindow } from './PickupWindow';
import { DistanceLabel } from './DistanceLabel';
import { PriceTag } from './PriceTag';
import { colors, radii } from '@/lib/theme';

const CAROUSEL_WIDTH = 264;
const AVATAR = 42;

/** Carte de panier surprise façon TGTG (feed + carrousels + favoris). */
export function BagCard({
  bag,
  layout = 'full',
  onPress,
}: {
  bag: BagCardData;
  layout?: 'carousel' | 'full';
  onPress?: () => void;
}) {
  const { t } = useTranslation('common');
  const imageHeight = layout === 'carousel' ? 130 : 158;
  const photo = mediaUrl(bag.imageUrl) ?? foodPhoto(bag.storeCategory, bag.storeSlug);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        width: layout === 'carousel' ? CAROUSEL_WIDTH : '100%',
        borderRadius: radii.card,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        opacity: pressed ? 0.96 : 1,
      })}
    >
      {/* Image + overlays */}
      <View style={{ height: imageHeight }}>
        <Image
          source={photo}
          style={{
            width: '100%',
            height: '100%',
            borderTopLeftRadius: radii.card,
            borderTopRightRadius: radii.card,
          }}
          contentFit="cover"
          cachePolicy="disk"
          recyclingKey={bag.bagInstanceId}
          transition={150}
        />
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <Badge label={t('browse.left', { count: bag.quantityAvailable })} tone="white" />
        </View>
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <FavoriteButton storeId={bag.storeId} size={34} />
        </View>
        {/* Avatar du commerce chevauchant le bas de l'image */}
        <View style={{ position: 'absolute', bottom: -AVATAR / 2, left: 12 }}>
          <StoreAvatar name={bag.storeName} size={AVATAR} bordered />
        </View>
      </View>

      {/* Corps */}
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: AVATAR / 2 + 8 }}>
        <AppText variant="title" numberOfLines={1}>
          {bag.storeName}
        </AppText>
        <AppText variant="body" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
          {bag.title}
        </AppText>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
          }}
        >
          <PickupWindow startAt={bag.pickupStartAt} endAt={bag.pickupEndAt} />
          <DistanceLabel meters={bag.distanceMeters} />
          <RatingStars rating={bag.ratingAvg} count={bag.ratingCount} />
        </View>

        <View style={{ marginTop: 12 }}>
          <PriceTag price={bag.price} originalValue={bag.originalValue} />
        </View>
      </View>
    </Pressable>
  );
}
