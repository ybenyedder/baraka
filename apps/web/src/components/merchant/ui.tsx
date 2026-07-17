'use client';

import type { ReactNode } from 'react';
import { STORE_TIME_ZONE } from '@baraka/shared';

/** Classe commune des champs de formulaire du portail commerçant. */
export const inputCls =
  'w-full rounded-lg border border-pine/15 bg-white px-3.5 py-2.5 text-sm text-pine outline-none transition focus:border-pine/40';

/** Champ avec libellé au-dessus (les placeholders seuls sont illisibles en édition). */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-black/45">{label}</span>
      {children}
    </label>
  );
}

/** Carte blanche standard du portail. */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm sm:p-6 ${className ?? ''}`}>
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-display font-extrabold text-pine">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Message de retour (succès ou erreur) sous une action. */
export function Feedback({ msg }: { msg: { text: string; ok: boolean } | null }) {
  if (!msg) return null;
  return (
    <p
      className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
        msg.ok ? 'bg-[#0e8a76]/10 text-[#0e8a76]' : 'bg-red-50 text-red-700'
      }`}
    >
      {msg.text}
    </p>
  );
}

// ── Libellés français des statuts / catégories ────────────────────────────────

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Paiement en attente',
  reserved: 'Réservée',
  picked_up: 'Retirée',
  cancelled_user: 'Annulée (client)',
  cancelled_store: 'Annulée (boutique)',
  no_show: 'Non retirée',
  payment_failed: 'Paiement échoué',
};

export const STORE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Active',
  paused: 'En pause',
  archived: 'Archivée',
};

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  draft: 'En préparation',
  approved: 'Approuvé',
  paid: 'Payé',
};

export const INSTANCE_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programmé',
  live: 'En vente',
  sold_out: 'Épuisé',
  ended: 'Terminé',
  cancelled: 'Annulé',
};

export const MERCHANT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de validation',
  approved: 'Approuvé',
  rejected: 'Refusé',
  suspended: 'Suspendu',
};

export const STORE_CATEGORY_LABELS: Record<string, string> = {
  meals: 'Repas',
  bakery_pastry: 'Boulangerie & pâtisserie',
  groceries: 'Épicerie',
  cafe: 'Café',
  hotel_buffet: "Buffet d'hôtel",
  other: 'Autre',
};

export const BAG_CATEGORY_LABELS: Record<string, string> = {
  meal: 'Repas',
  bakery: 'Boulangerie',
  grocery: 'Épicerie',
  other: 'Autre',
};

export const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'Végétarien',
  vegan: 'Végan',
  halal: 'Halal',
  gluten_free: 'Sans gluten',
  lactose_free: 'Sans lactose',
  contains_nuts: 'Fruits à coque',
  contains_seafood: 'Fruits de mer',
};

/** 0 = dimanche … 6 = samedi (aligné sur Date.getDay() et le schéma DB). */
export const WEEKDAY_LABELS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;

const BADGE_TONES: Record<string, string> = {
  // tons par famille de statut — jamais la couleur seule : le libellé est toujours affiché
  ok: 'bg-[#0e8a76]/10 text-[#0e8a76]',
  warn: 'bg-yellow/25 text-pine',
  bad: 'bg-red-50 text-red-700',
  muted: 'bg-black/[0.06] text-black/60',
};

const STATUS_TONE: Record<string, keyof typeof BADGE_TONES> = {
  // commandes
  reserved: 'warn',
  picked_up: 'ok',
  pending_payment: 'muted',
  cancelled_user: 'bad',
  cancelled_store: 'bad',
  no_show: 'bad',
  payment_failed: 'bad',
  // boutiques
  active: 'ok',
  draft: 'muted',
  paused: 'warn',
  archived: 'muted',
  // instances
  live: 'ok',
  scheduled: 'muted',
  sold_out: 'warn',
  ended: 'muted',
  cancelled: 'bad',
  // payouts / merchant
  approved: 'ok',
  paid: 'ok',
  pending: 'warn',
  rejected: 'bad',
  suspended: 'bad',
};

/** Badge de statut : couleur + libellé français explicite. */
export function StatusBadge({
  status,
  labels,
}: {
  status: string;
  labels: Record<string, string>;
}) {
  const tone = BADGE_TONES[STATUS_TONE[status] ?? 'muted'];
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {labels[status] ?? status}
    </span>
  );
}

/** Date courte française en heure de Tunis (ex : « lun. 6 juil. »). */
export function formatDayFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: STORE_TIME_ZONE,
  });
}

/** Heure HH:MM (24h) en heure de Tunis (les créneaux/horodatages ne dépendent pas du fuseau serveur). */
export function formatTimeFr(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: STORE_TIME_ZONE,
  });
}
