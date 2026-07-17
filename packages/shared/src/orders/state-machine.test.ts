import { describe, it, expect } from 'vitest';
import {
  canTransition,
  applyEvent,
  nextStatus,
  initialStatus,
  isTerminal,
  InvalidTransitionError,
  evaluateUserCancellation,
  evaluateStoreCancellation,
  ORDER_TRANSITIONS,
} from './state-machine';
import { ORDER_STATUSES } from '../enums';

describe('Machine à états — transitions', () => {
  it('pending_payment → reserved via payment_succeeded', () => {
    expect(applyEvent('pending_payment', 'payment_succeeded')).toBe('reserved');
  });

  it('reserved → picked_up via validate_pickup', () => {
    expect(applyEvent('reserved', 'validate_pickup')).toBe('picked_up');
  });

  it('reserved → no_show via mark_no_show', () => {
    expect(applyEvent('reserved', 'mark_no_show')).toBe('no_show');
  });

  it('hold_expired depuis pending_payment → payment_failed', () => {
    expect(applyEvent('pending_payment', 'hold_expired')).toBe('payment_failed');
  });

  it('refuse validate_pickup depuis pending_payment', () => {
    expect(() => applyEvent('pending_payment', 'validate_pickup')).toThrow(InvalidTransitionError);
  });

  it('refuse toute transition depuis un état terminal', () => {
    expect(() => applyEvent('picked_up', 'user_cancel')).toThrow(InvalidTransitionError);
    expect(nextStatus('picked_up', 'user_cancel')).toBeNull();
  });

  it('canTransition reflète la table', () => {
    expect(canTransition('reserved', 'picked_up')).toBe(true);
    expect(canTransition('reserved', 'payment_failed')).toBe(false);
  });

  it('tous les statuts ont une entrée dans la table de transitions', () => {
    for (const s of ORDER_STATUSES) {
      expect(ORDER_TRANSITIONS[s]).toBeDefined();
    }
  });

  it('les états terminaux sont détectés', () => {
    expect(isTerminal('picked_up')).toBe(true);
    expect(isTerminal('reserved')).toBe(false);
  });
});

describe('Statut initial selon paiement', () => {
  it('cash → reserved direct', () => {
    expect(initialStatus('cash')).toBe('reserved');
  });
  it('konnect → pending_payment', () => {
    expect(initialStatus('konnect')).toBe('pending_payment');
  });
  it('stripe → pending_payment', () => {
    expect(initialStatus('stripe')).toBe('pending_payment');
  });
});

describe('Politique d annulation client', () => {
  const base = {
    status: 'reserved' as const,
    pickupStartAtMs: 10_000_000,
    cancellationWindowMinutes: 120,
  };

  it('annulation autorisée bien avant le créneau (paiement en ligne → remboursement dû)', () => {
    const out = evaluateUserCancellation({
      ...base,
      paymentMethod: 'konnect',
      nowMs: base.pickupStartAtMs - 3 * 60 * 60 * 1000, // 3 h avant
    });
    expect(out.allowed).toBe(true);
    expect(out.refundDue).toBe(true);
    expect(out.refundReason).toBe('user_cancelled');
  });

  it('cash : autorisé mais aucun remboursement (rien encaissé)', () => {
    const out = evaluateUserCancellation({
      ...base,
      paymentMethod: 'cash',
      nowMs: base.pickupStartAtMs - 3 * 60 * 60 * 1000,
    });
    expect(out.allowed).toBe(true);
    expect(out.refundDue).toBe(false);
  });

  it('trop tard (moins de 2 h avant) → refusé', () => {
    const out = evaluateUserCancellation({
      ...base,
      paymentMethod: 'konnect',
      nowMs: base.pickupStartAtMs - 30 * 60 * 1000, // 30 min avant
    });
    expect(out.allowed).toBe(false);
    expect(out.denyReason).toBe('too_late');
  });

  it('commande déjà terminale → refusé', () => {
    const out = evaluateUserCancellation({
      ...base,
      status: 'picked_up',
      paymentMethod: 'konnect',
      nowMs: 0,
    });
    expect(out.allowed).toBe(false);
    expect(out.denyReason).toBe('already_terminal');
  });
});

describe('Politique d annulation magasin', () => {
  it('toujours autorisée si non terminale, remboursement si payé en ligne', () => {
    const out = evaluateStoreCancellation({ status: 'reserved', paymentMethod: 'konnect' });
    expect(out.allowed).toBe(true);
    expect(out.refundDue).toBe(true);
    expect(out.refundReason).toBe('store_cancelled');
  });

  it('refusée si commande terminale', () => {
    const out = evaluateStoreCancellation({ status: 'picked_up', paymentMethod: 'konnect' });
    expect(out.allowed).toBe(false);
  });
});
