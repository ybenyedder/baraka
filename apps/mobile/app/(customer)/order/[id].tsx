import { View, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatMoney, money, type Currency } from '@baraka/shared';
import { api } from '@/lib/api';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PickupWindow } from '@/components/PickupWindow';
import { StoreAvatar } from '@/components/StoreAvatar';
import { useLocale } from '@/hooks/useLocale';
import { colors, radii } from '@/lib/theme';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation('orders');
  const { t: tc } = useTranslation('common');
  const { bcp47 } = useLocale();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrder(String(id)),
    enabled: Boolean(id),
  });

  if (isLoading || !order) {
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

  const isReserved = order.status === 'reserved';
  const isPickedUp = order.status === 'picked_up';
  const statusLabel = t(`status.${order.status}`, { defaultValue: order.status });

  async function collect() {
    try {
      await api.confirmPickup(String(id));
      // Invalide aussi la LISTE des commandes : sinon elle reste figée sur l'ancien statut.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['order', id] }),
        qc.invalidateQueries({ queryKey: ['orders'] }),
      ]);
    } catch (e) {
      Alert.alert(tc('errorGeneric'), e instanceof Error ? e.message : '');
    }
  }

  async function doCancel() {
    try {
      const res = await api.cancelOrder(String(id));
      // La commande change de statut ET restitue du stock → rafraîchir liste + découverte.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['order', id] }),
        qc.invalidateQueries({ queryKey: ['orders'] }),
        qc.invalidateQueries({ queryKey: ['browse'] }),
      ]);
      if (res.refundDue) Alert.alert('✓', t('cancel.refunded'));
    } catch (e) {
      Alert.alert(tc('errorGeneric'), e instanceof Error ? e.message : '');
    }
  }

  // Confirmation avant une action destructive et irréversible (un tap accidentel annulait tout).
  function cancel() {
    Alert.alert(t('cancel.title'), t('cancel.confirm'), [
      { text: tc('actions.back'), style: 'cancel' },
      { text: t('cancel.confirm'), style: 'destructive', onPress: () => void doCancel() },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}>
        {/* En-tête */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <StoreAvatar name={order.storeName} size={48} />
          <View style={{ flex: 1 }}>
            <AppText variant="title" numberOfLines={1}>
              {order.storeName}
            </AppText>
            <AppText variant="caption" tone="muted">
              {order.number}
            </AppText>
          </View>
          <Badge
            label={statusLabel}
            tone={isPickedUp ? 'pine' : isReserved ? 'yellow' : 'danger'}
          />
        </View>

        {/* Code de retrait */}
        {isReserved && order.pickupCode ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.pine,
              borderRadius: radii.card,
              paddingVertical: 28,
            }}
          >
            <AppText variant="label" color={colors.cream}>
              {t('pickupCode')}
            </AppText>
            <AppText
              weight="extrabold"
              color={colors.yellow}
              style={{ fontSize: 44, letterSpacing: 8, marginTop: 6 }}
            >
              {order.pickupCode}
            </AppText>
          </View>
        ) : null}

        {/* Infos */}
        <View
          style={{ backgroundColor: colors.white, borderRadius: radii.card, padding: 16, gap: 10 }}
        >
          <AppText variant="subtitle">{order.bagTitle}</AppText>
          <PickupWindow startAt={order.pickupStartAt} endAt={order.pickupEndAt} tone="pine" />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
            }}
          >
            <AppText variant="body" tone="muted">
              {t('checkout.total')}
            </AppText>
            <AppText variant="price">
              {formatMoney(money(order.total.amountMinor, order.total.currency as Currency), bcp47)}
            </AppText>
          </View>
        </View>

        {/* Actions */}
        {isReserved ? (
          <View style={{ gap: 10 }}>
            {order.paymentMethod !== 'cash' ? (
              <PrimaryButton label={t('detail.collect')} onPress={collect} />
            ) : null}
            <PrimaryButton label={t('detail.cancel')} variant="outline" onPress={cancel} />
          </View>
        ) : null}

        {isPickedUp ? (
          <PrimaryButton
            label={t('detail.review')}
            onPress={() => router.push(`/(customer)/review/${order.id}`)}
          />
        ) : null}

        <Pressable
          onPress={() => router.replace('/(customer)/(tabs)/orders')}
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <AppText variant="label" tone="pine" weight="bold">
            {t('detail.backToList')}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}
