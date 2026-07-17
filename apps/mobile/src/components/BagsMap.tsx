import { useMemo } from 'react';
import { View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Constants from 'expo-constants';
import { MapView, Camera, MarkerView } from '@maplibre/maplibre-react-native';
import { formatMoney, money, type Currency, type BagCard as BagCardData } from '@baraka/shared';
import { AppText } from './ui/AppText';
import { useLocale } from '@/hooks/useLocale';
import { colors } from '@/lib/theme';

const STYLE_URL =
  (Constants.expoConfig?.extra?.mapStyleUrl as string | undefined) ??
  'https://tiles.openfreemap.org/styles/liberty';

/**
 * Carte MapLibre avec épingles-prix par commerce. Tuiles vectorielles libres
 * (pas de clé Mapbox/Google). Coordonnées MapLibre = [lng, lat].
 */
export function BagsMap({
  bags,
  center,
  selectedId,
  onSelectBag,
  interactive = true,
  zoom = 12.5,
  style,
}: {
  bags: BagCardData[];
  center: { lat: number; lng: number };
  selectedId?: string | null;
  onSelectBag?: (bag: BagCardData) => void;
  interactive?: boolean;
  zoom?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { bcp47 } = useLocale();

  // Une épingle par commerce (le moins cher gagne si plusieurs paniers).
  const markers = useMemo(() => {
    const byStore = new Map<string, BagCardData>();
    for (const b of bags) {
      const cur = byStore.get(b.storeId);
      if (!cur || b.price.amountMinor < cur.price.amountMinor) byStore.set(b.storeId, b);
    }
    return [...byStore.values()];
  }, [bags]);

  return (
    <View style={style}>
      <MapView
        style={{ flex: 1 }}
        mapStyle={STYLE_URL}
        logoEnabled
        attributionEnabled
        compassEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Camera
          centerCoordinate={[center.lng, center.lat]}
          zoomLevel={zoom}
          animationDuration={0}
        />
        {markers.map((b) => {
          const active = selectedId === b.bagInstanceId || selectedId === b.storeId;
          return (
            <MarkerView key={b.storeId} coordinate={[b.lng, b.lat]} anchor={{ x: 0.5, y: 1 }}>
              <Pressable onPress={() => onSelectBag?.(b)}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: active ? colors.pine : colors.white,
                    borderWidth: 1.5,
                    borderColor: colors.pine,
                    shadowColor: '#000',
                    shadowOpacity: 0.18,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 4,
                  }}
                >
                  <AppText
                    variant="caption"
                    weight="extrabold"
                    color={active ? colors.white : colors.pine}
                  >
                    {formatMoney(money(b.price.amountMinor, b.price.currency as Currency), bcp47)}
                  </AppText>
                </View>
              </Pressable>
            </MarkerView>
          );
        })}
      </MapView>
    </View>
  );
}
