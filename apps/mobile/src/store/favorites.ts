import { create } from 'zustand';

/**
 * Surcouche optimiste locale des favoris : le bouton cœur bascule instantanément
 * sans attendre le refetch de la liste. Store isolé (aucune dépendance à la session)
 * pour pouvoir être purgé au logout sans créer de cycle d'import avec `session.ts`.
 */
export const useFavoriteOverrides = create<{
  map: Record<string, boolean>;
  set: (id: string, v: boolean) => void;
  reset: () => void;
}>((set) => ({
  map: {},
  set: (id, v) => set((s) => ({ map: { ...s.map, [id]: v } })),
  reset: () => set({ map: {} }),
}));

/** Vide les overrides optimistes (appelé au logout : sinon les favoris de l'ancien
 *  compte fuiteraient visuellement vers le prochain utilisateur du même appareil). */
export function resetFavoriteOverrides(): void {
  useFavoriteOverrides.getState().reset();
}
