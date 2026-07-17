import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import {
  foodPhoto,
  formatMoney,
  money,
  type Currency,
  type Order,
  type OrderStatus,
} from '@baraka/shared';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';
import { PickupWindow } from './PickupWindow';
import { useLocale } from '@/hooks/useLocale';
import { mediaUrl } from '@/lib/api';
import { colors, radii } from '@/lib/theme';

const STATUS_TONE: Record<OrderStatus, 'yellow' | 'pine' | 'danger'> = {
  reserved: 'yellow',
  pending_payment: 'yellow',
  picked_up: 'pine',
  cancelled_user: 'danger',
  cancelled_store: 'danger',
  no_show: 'danger',
  payment_failed: 'danger',
};

/** Carte de commande (liste À venir / Historique). */
export function OrderCard({ order, onPress }: { order: Order; onPress?: () => void }) {
  const { t } = useTranslation('orders');
  const { bcp47 } = useLocale();
  const photo = mediaUrl(order.imageUrl) ?? foodPhoto(null, order.storeSlug);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: radii.card,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        opacity: pressed ? 0.96 : 1,
      })}
    >
      <Image
        source={photo}
        style={{ width: 76, height: 76, borderRadius: radii.md }}
        contentFit="cover"
        cachePolicy="disk"
        recyclingKey={order.id}
      />
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <AppText variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {order.storeName}
          </AppText>
          <Badge
            label={t(`status.${order.status}`, { defaultValue: order.status })}
            tone={STATUS_TONE[order.status]}
          />
        </View>
        <AppText variant="body" tone="muted" numberOfLines={1}>
          {order.bagTitle}
        </AppText>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <PickupWindow startAt={order.pickupStartAt} endAt={order.pickupEndAt} />
          <AppText variant="bodyBold" tone="pine">
            {formatMoney(money(order.total.amountMinor, order.total.currency as Currency), bcp47)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}
