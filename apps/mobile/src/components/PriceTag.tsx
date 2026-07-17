import { View } from 'react-native';
import { formatMoney, money, type Currency, type Money } from '@baraka/shared';
import { AppText } from './ui/AppText';
import { useLocale } from '@/hooks/useLocale';
import { colors } from '@/lib/theme';

/** Prix final (pilule jaune) + valeur d'origine barrée. */
export function PriceTag({
  price,
  originalValue,
  pill = true,
  align = 'left',
}: {
  price: Money;
  originalValue?: Money;
  pill?: boolean;
  align?: 'left' | 'right';
}) {
  const { bcp47 } = useLocale();
  const p = money(price.amountMinor, price.currency as Currency);
  const hasDiscount = originalValue && originalValue.amountMinor > price.amountMinor;
  return (
    <View
      style={{
        flexDirection: align === 'right' ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View
        style={
          pill
            ? {
                backgroundColor: colors.yellow,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }
            : undefined
        }
      >
        <AppText variant="price" tone="pine">
          {formatMoney(p, bcp47)}
        </AppText>
      </View>
      {hasDiscount ? (
        <AppText variant="caption" tone="muted" style={{ textDecorationLine: 'line-through' }}>
          {formatMoney(money(originalValue.amountMinor, originalValue.currency as Currency), bcp47)}
        </AppText>
      ) : null}
    </View>
  );
}
