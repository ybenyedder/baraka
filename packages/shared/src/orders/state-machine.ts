/**
 * Machine à états des commandes.
 *
 * Cycle de vie :
 *   (en ligne)  pending_payment ──paiement OK──▶ reserved ──validation──▶ picked_up
 *   (espèces)   reserved (direct) …
 *
 * États terminaux : picked_up, cancelled_user, cancelled_store, no_show, payment_failed.
 *
 * La garde de stock atomique (anti-oversell) vit côté SQL dans l'API ; ce module ne
 * gère QUE la légalité des transitions de statut et la politique d'annulation/remboursement.
 */

import type { OrderStatus, PaymentMethod, RefundReason } from '../enums';
import { TERMINAL_ORDER_STATUSES } from '../enums';

/** Événements qui font transiter une commande. */
export type OrderEvent =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'hold_expired'
  | 'user_cancel'
  | 'store_cancel'
  | 'validate_pickup'
  | 'mark_no_show';

/** Transitions autorisées : statut courant → statuts atteignables. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ['reserved', 'payment_failed', 'cancelled_user'],
  reserved: ['picked_up', 'cancelled_user', 'cancelled_store', 'no_show'],
  // États terminaux : aucune transition sortante.
  picked_up: [],
  cancelled_user: [],
  cancelled_store: [],
  no_show: [],
  payment_failed: [],
};

/** Table événement → statut cible, en fonction du statut courant. */
const EVENT_TARGETS: Record<OrderEvent, Partial<Record<OrderStatus, OrderStatus>>> = {
  payment_succeeded: { pending_payment: 'reserved' },
  payment_failed: { pending_payment: 'payment_failed' },
  hold_expired: { pending_payment: 'payment_failed' },
  user_cancel: { pending_payment: 'cancelled_user', reserved: 'cancelled_user' },
  store_cancel: { reserved: 'cancelled_store' },
  validate_pickup: { reserved: 'picked_up' },
  mark_no_show: { reserved: 'no_show' },
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: OrderStatus,
    public readonly event: OrderEvent,
  ) {
    super(`Transition invalide : impossible d'appliquer « ${event} » depuis « ${from} ».`);
    this.name = 'InvalidTransitionError';
  }
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

/** Vrai si passer de `from` à `to` est une transition légale. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Statut cible d'un événement, ou null si l'événement n'est pas applicable. */
export function nextStatus(from: OrderStatus, event: OrderEvent): OrderStatus | null {
  return EVENT_TARGETS[event][from] ?? null;
}

/** Applique un événement ; lève InvalidTransitionError si illégal. */
export function applyEvent(from: OrderStatus, event: OrderEvent): OrderStatus {
  const to = nextStatus(from, event);
  if (to === null) throw new InvalidTransitionError(from, event);
  return to;
}

/** Statut initial d'une commande selon le moyen de paiement. */
export function initialStatus(method: PaymentMethod): OrderStatus {
  // Espèces : pas de règlement en ligne → réservé immédiatement.
  // Konnect/Stripe : en attente de paiement (retenue de stock temporaire).
  return method === 'cash' ? 'reserved' : 'pending_payment';
}

// ── Politique d'annulation / remboursement ───────────────────────────────────

export interface CancellationContext {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  /** Début du créneau de retrait (epoch ms). */
  pickupStartAtMs: number;
  /** Instant courant (epoch ms). */
  nowMs: number;
  /** Fenêtre minimale avant retrait pour annuler côté client (minutes). */
  cancellationWindowMinutes: number;
}

export interface CancellationOutcome {
  /** L'annulation client est-elle permise ? */
  allowed: boolean;
  /** Un remboursement est-il dû (uniquement si paiement en ligne encaissé) ? */
  refundDue: boolean;
  refundReason?: RefundReason;
  /** Motif de refus le cas échéant (pour message utilisateur). */
  denyReason?: 'too_late' | 'already_terminal' | 'not_cancellable_state';
}

/**
 * Décide de l'issue d'une demande d'annulation CLIENT.
 * Règle : annulation autorisée si ≥ fenêtre avant le début du créneau.
 * Remboursement dû uniquement pour les paiements en ligne (le cash n'a rien encaissé).
 */
export function evaluateUserCancellation(ctx: CancellationContext): CancellationOutcome {
  if (isTerminal(ctx.status)) {
    return { allowed: false, refundDue: false, denyReason: 'already_terminal' };
  }
  if (ctx.status !== 'reserved' && ctx.status !== 'pending_payment') {
    return { allowed: false, refundDue: false, denyReason: 'not_cancellable_state' };
  }

  const windowMs = ctx.cancellationWindowMinutes * 60_000;
  const tooLate = ctx.nowMs > ctx.pickupStartAtMs - windowMs;
  if (tooLate) {
    return { allowed: false, refundDue: false, denyReason: 'too_late' };
  }

  const paidOnline = ctx.paymentMethod !== 'cash' && ctx.status === 'reserved';
  return {
    allowed: true,
    refundDue: paidOnline,
    refundReason: 'user_cancelled',
  };
}

/**
 * Annulation par le MAGASIN (ex : plus de stock, fermeture) — toujours autorisée
 * tant que la commande n'est pas terminale ; remboursement intégral si payé en ligne.
 */
export function evaluateStoreCancellation(ctx: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
}): CancellationOutcome {
  if (isTerminal(ctx.status)) {
    return { allowed: false, refundDue: false, denyReason: 'already_terminal' };
  }
  const paidOnline = ctx.paymentMethod !== 'cash' && ctx.status === 'reserved';
  return { allowed: true, refundDue: paidOnline, refundReason: 'store_cancelled' };
}
