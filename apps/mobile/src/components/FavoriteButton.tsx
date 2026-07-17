import { Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { IconButton } from './ui/IconButton';
import { useFavorites } from '@/hooks/useFavorites';
import { useSession } from '@/store/session';
import { colors } from '@/lib/theme';

/**
 * Bouton cœur mutualisé (état optimiste via useFavorites). Redirige vers l'auth
 * si l'utilisateur n'est pas connecté.
 */
export function FavoriteButton({
  storeId,
  size = 40,
  tone = 'light',
}: {
  storeId: string;
  size?: number;
  tone?: 'light' | 'dark' | 'ghost';
}) {
  const { isFavorite, toggle } = useFavorites();
  const isAuth = useSession((s) => s.isAuthenticated);
  const router = useRouter();
  const fav = isFavorite(storeId);

  return (
    <IconButton
      icon={Heart}
      tone={tone}
      size={size}
      accessibilityLabel="Favori"
      fill={fav ? colors.yellow : 'none'}
      color={fav ? colors.yellow : undefined}
      onPress={() => {
        if (!isAuth) {
          router.push('/(auth)/welcome');
          return;
        }
        void toggle(storeId);
      }}
    />
  );
}
