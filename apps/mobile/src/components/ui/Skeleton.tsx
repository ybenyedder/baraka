import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';
import { colors } from '@/lib/theme';

/** Bloc placeholder à opacité pulsée (chargement des listes). */
export function Skeleton({
  width = '100%',
  height,
  radius = 12,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.creamDeep, opacity },
        style,
      ]}
    />
  );
}
