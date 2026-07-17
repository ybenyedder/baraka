import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { foodPhoto, type BagCard as BagCardData } from '@baraka/shared';
import { AppText } from './ui/AppText';
import { IconButton } from './ui/IconButton';
import { PickupWindow } from './PickupWindow';
import { DistanceLabel } from './DistanceLabel';
import { PriceTag } from './PriceTag';
import { mediaUrl } from '@/lib/api';
import { colors, radii } from '@/lib/theme';

/** Carte compacte affichée en bas de la vue carte au tap sur une épingle. */
export function StoreMapCard({
  bag,
  onPress,
  onClose,
}: {
  bag: BagCardData;
  onPress: () => void;
  onClose: () => void;
}) {
  const photo = mediaUrl(bag.imageUrl) ?? foodPhoto(bag.storeCategory, bag.storeSlug);
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: radii.card,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
        <Image
          source={photo}
          style={{ width: 76, height: 76, borderRadius: radii.md }}
          contentFit="cover"
          cachePolicy="disk"
        />
        <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
          <AppText variant="title" numberOfLines={1}>
            {bag.storeName}
          </AppText>
          <PickupWindow startAt={bag.pickupStartAt} endAt={bag.pickupEndAt} />
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <PriceTag price={bag.price} originalValue={bag.originalValue} />
            <DistanceLabel meters={bag.distanceMeters} />
          </View>
        </View>
      </Pressable>
      <View style={{ position: 'absolute', top: 6, right: 6 }}>
        <IconButton icon={X} tone="ghost" size={28} iconSize={16} onPress={onClose} />
      </View>
    </View>
  );
}
