import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallet, PackageX } from 'lucide-react-native';
import {
  formatMoney,
  money,
  multiplyByQuantity,
  subtract,
  foodPhoto,
  CURRENCY_CODES,
  type Currency,
} from '@baraka/shared';
import { api, mediaUrl } from '@/lib/api';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { PickupWindow } from '@/components/PickupWindow';
import { useLocale } from '@/hooks/useLocale';
import { colors, radii } from '@/lib/theme';

/** Replie toute devise inconnue (param de deep link forgé) sur TND : évite le RangeError
 *  d'`Intl.NumberFormat({ currency })` qui ferait planter le rendu de l'écran. */
function safeCurrency(v: string | undefined): Currency {
  return (CURRENCY_CODES as readonly string[]).includes(v ?? '') ? (v as Currency) : 'TND';
}

export default function Checkout() {
  const params = useLocalSearchParams<{
    bagInstanceId: string;
    title: string;
    storeName: string;
    priceMinor: string;
    originalMinor: string;
    currency: string;
    quantityAvailable: string;
    pickupStartAt: string;
    pickupEndAt: string;
    imageUrl: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation('orders');
  const { t: tc } = useTranslation('common');
  const { t: td } = useTranslation('discovery');
  const { bcp47 } = useLocale();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  // ⚠️ Les params proviennent de la route (deep link `baraka://…` falsifiable) : ils ne
  // sont qu'un APERÇU d'affichage, jamais une source de vérité. Le prix réel est calculé
  // côté serveur à partir du seul `bagInstanceId` (voir reserve()) et le montant définitif
  // s'affiche sur l'écran de commande après réservation. On sanitise donc les valeurs pour
  // qu'un lien forgé ne puisse pas injecter un NaN/négatif dans l'UI.
  const toSafeMinor = (v: string | undefined): number => {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  // Prix AUTORITATIF récupéré côté serveur par bagInstanceId (les params de deep link ne sont
  // qu'un aperçu falsifiable, affiché le temps du chargement) (L10).
  const {
    data: bag,
    isLoading: bagLoading,
    isError: bagError,
    refetch: refetchBag,
  } = useQuery({
    queryKey: ['bag', params.bagInstanceId],
    queryFn: () => api.bagDetail(String(params.bagInstanceId)),
    staleTime: 30_000,
    enabled: !!params.bagInstanceId,
  });

  const currency = safeCurrency(bag?.price.currency ?? params.currency);
  const unit = money(bag ? bag.price.amountMinor : toSafeMinor(params.priceMinor), currency);
  const unitOriginal = money(
    bag ? bag.originalValue.amountMinor : toSafeMinor(params.originalMinor ?? params.priceMinor),
    currency,
  );
  const available = bag ? bag.quantityAvailable : toSafeMinor(params.quantityAvailable) || 1;
  const soldOut = bag ? bag.quantityAvailable <= 0 : false;
  const maxQty = Math.max(1, Math.min(10, available));
  const title = bag?.title ?? params.title;
  const storeName = bag?.storeName ?? params.storeName;
  const pickupStartAt = bag?.pickupStartAt ?? params.pickupStartAt;
  const pickupEndAt = bag?.pickupEndAt ?? params.pickupEndAt;
  const total = multiplyByQuantity(unit, qty);
  // Économie affichée seulement si cohérent (prix barré > prix) — indicatif.
  const savings = multiplyByQuantity(subtract(unitOriginal, unit), qty);
  const photo =
    (bag?.imageUrl && mediaUrl(bag.imageUrl)) ||
    params.imageUrl ||
    foodPhoto(null, storeName ?? 'bag');

  // Re-clampe la quantité choisie quand le stock autoritatif arrive/diminue : sinon un aperçu
  // qui annonçait 5 dispos laisserait tenter une réservation de 5 sur 2 réellement libres (500).
  useEffect(() => {
    setQty((q) => Math.min(q, maxQty));
  }, [maxQty]);

  async function reserve() {
    setLoading(true);
    try {
      const order = await api.createOrder({
        bagInstanceId: String(params.bagInstanceId),
        quantity: qty,
        paymentMethod: 'cash',
      });
      // La réservation a consommé du stock et créé une commande : invalide les listes qui
      // en dépendent (sinon l'onglet Commandes et la découverte restent périmés).
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['orders'] }),
        qc.invalidateQueries({ queryKey: ['browse'] }),
        qc.invalidateQueries({ queryKey: ['bag', params.bagInstanceId] }),
      ]);
      if (order.payment?.kind === 'redirect' && order.payment.redirectUrl) {
        Alert.alert(t('checkout.payOnline'), order.payment.redirectUrl);
      }
      router.replace(`/(customer)/order/${order.id}`);
    } catch (e) {
      Alert.alert(tc('errorGeneric'), e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  }

  // Deep link nu (depuis une notification) : le panier peut être introuvable/expiré. On bloque
  // le CTA et on propose de réessayer plutôt que d'afficher « Total : 0 » avec un bouton actif.
  if (bagError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, justifyContent: 'center' }}>
        <EmptyState
          icon={PackageX}
          title={tc('errorGeneric')}
          actionLabel={tc('actions.retry')}
          onAction={() => void refetchBag()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }}>
        {/* Récap panier */}
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Image
            source={photo}
            style={{ width: 72, height: 72, borderRadius: radii.md }}
            contentFit="cover"
            cachePolicy="disk"
          />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="title">{storeName}</AppText>
            <AppText variant="body" tone="muted" numberOfLines={1}>
              {title}
            </AppText>
            {pickupStartAt && pickupEndAt ? (
              <PickupWindow startAt={pickupStartAt} endAt={pickupEndAt} tone="pine" />
            ) : null}
          </View>
        </View>

        {/* Quantité */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.white,
            borderRadius: radii.card,
            padding: 16,
          }}
        >
          <AppText variant="subtitle">{t('checkout.quantity')}</AppText>
          <QuantityStepper value={qty} min={1} max={maxQty} onChange={setQty} />
        </View>

        {/* Paiement */}
        <View>
          <AppText variant="label" tone="muted" style={{ marginBottom: 8 }}>
            {t('checkout.title')}
          </AppText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: colors.white,
              borderRadius: radii.card,
              padding: 16,
              borderWidth: 1.5,
              borderColor: colors.pine,
            }}
          >
            <Wallet size={22} color={colors.pine} strokeWidth={2.2} />
            <AppText variant="subtitle">{t('checkout.payAtPickup')}</AppText>
          </View>
        </View>

        {/* Total */}
        <View
          style={{ backgroundColor: colors.white, borderRadius: radii.card, padding: 16, gap: 8 }}
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <AppText variant="subtitle">{t('checkout.total')}</AppText>
            <AppText variant="price">{formatMoney(total, bcp47)}</AppText>
          </View>
          {savings.amountMinor > 0 ? (
            <AppText variant="caption" tone="pine" weight="bold">
              {t('checkout.savings', { value: formatMoney(savings, bcp47) })}
            </AppText>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={{
          backgroundColor: colors.cream,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <PrimaryButton
          label={soldOut ? td('bag.soldOut') : t('checkout.reserve')}
          onPress={reserve}
          loading={loading}
          // Tant que le prix autoritatif n'est pas chargé (ou si le panier est épuisé), on
          // n'autorise pas la réservation : évite une commande à un total non vérifié / à 0.
          disabled={soldOut || bagLoading}
        />
      </View>
    </View>
  );
}
