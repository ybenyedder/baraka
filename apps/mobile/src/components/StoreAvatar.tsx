import { View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from './ui/AppText';
import { mediaUrl } from '@/lib/api';
import { colors } from '@/lib/theme';

/** Pastille ronde du commerce : logo si dispo, sinon initiales sur fond pine. */
export function StoreAvatar({
  name,
  logoUrl,
  size = 40,
  bordered = false,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  bordered?: boolean;
}) {
  const logo = mediaUrl(logoUrl);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.pine,
        borderWidth: bordered ? 3 : 0,
        borderColor: colors.white,
      }}
    >
      {logo ? (
        <Image
          source={logo}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="disk"
        />
      ) : (
        <AppText
          weight="extrabold"
          color={colors.cream}
          style={{ fontSize: Math.round(size * 0.34) }}
        >
          {name.slice(0, 2).toUpperCase()}
        </AppText>
      )}
    </View>
  );
}
