import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSession } from '@/store/session';
import { useFavoriteOverrides } from '@/store/favorites';

export function useFavorites() {
  const qc = useQueryClient();
  const isAuth = useSession((s) => s.isAuthenticated);
  const query = useQuery({ queryKey: ['favorites'], queryFn: api.favorites, enabled: isAuth });
  const overrides = useFavoriteOverrides((s) => s.map);
  const setOverride = useFavoriteOverrides((s) => s.set);

  const baseIds = useMemo(() => new Set((query.data?.items ?? []).map((s) => s.id)), [query.data]);

  const isFavorite = useCallback(
    (storeId: string): boolean => overrides[storeId] ?? baseIds.has(storeId),
    [overrides, baseIds],
  );

  const toggle = useCallback(
    async (storeId: string): Promise<void> => {
      const next = !(overrides[storeId] ?? baseIds.has(storeId));
      setOverride(storeId, next);
      try {
        await (next ? api.addFavorite(storeId) : api.removeFavorite(storeId));
        await qc.invalidateQueries({ queryKey: ['favorites'] });
      } catch {
        setOverride(storeId, !next); // rollback
      }
    },
    [overrides, baseIds, setOverride, qc],
  );

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    isFavorite,
    toggle,
  };
}
