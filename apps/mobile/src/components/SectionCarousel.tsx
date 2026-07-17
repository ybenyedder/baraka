import { View, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BagCard as BagCardData } from '@baraka/shared';
import { AppText } from './ui/AppText';
import { BagCard } from './BagCard';

/** Section « titre + carrousel horizontal de paniers » (écran Découvrir). */
export function SectionCarousel({
  title,
  bags,
  onPressBag,
  onSeeAll,
}: {
  title: string;
  bags: BagCardData[];
  onPressBag: (bag: BagCardData) => void;
  onSeeAll?: () => void;
}) {
  const { t } = useTranslation('common');
  if (bags.length === 0) return null;

  return (
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <AppText variant="display">{title}</AppText>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <AppText variant="label" tone="pine" weight="bold">
              {t('actions.seeAll')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={bags}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(b) => b.bagInstanceId}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        renderItem={({ item }) => (
          <BagCard bag={item} layout="carousel" onPress={() => onPressBag(item)} />
        )}
      />
    </View>
  );
}
