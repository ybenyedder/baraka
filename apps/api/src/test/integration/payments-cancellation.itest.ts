import { beforeEach, describe, expect, it } from 'vitest';
import { getSql } from '../../lib/db';
import { createOrder, cancelOrder } from '../../modules/orders/service';
import { processPaymentEvent } from '../../modules/payments/service';
import {
  resetDb,
  createUser,
  createMerchantWithStore,
  createLiveBagInstance,
  insertPendingOnlineOrder,
  reservedQty,
  orderStatus,
} from '../helpers';

/**
 * Tests d'intégration des chemins PAIEMENT / ANNULATION — complètent money-auth.itest.ts.
 * Couvrent les invariants d'INTÉGRITÉ non testés jusqu'ici :
 *   - libération de stock à l'annulation + non double-libération (H2)
 *   - garde anti sous-paiement fail-closed (M4)
 *   - idempotence du traitement des événements de paiement (M16)
 *
 * Le provider n'est PAS sollicité : `processPaymentEvent` reçoit un événement déjà normalisé
 * et n'appelle jamais le réseau sur le chemin succès/échec. L'env de test n'active que `cash`.
 */

const asCustomer = (u: { id: string; email: string; name: string }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: null,
});

beforeEach(async () => {
  await resetDb();
});

describe('Annulation client — libération de stock & non double-libération (H2)', () => {
  it('restitue le stock, ne rembourse pas le cash, et refuse une seconde annulation (état terminal)', async () => {
    const customer = await createUser();
    const { storeId } = await createMerchantWithStore();
    // Retrait à +5 h : bien à l'intérieur de la fenêtre d'annulation (120 min).
    const { bagInstanceId } = await createLiveBagInstance(storeId, {
      quantity: 5,
      pickupInHours: 5,
    });
    const { order } = await createOrder(
      asCustomer(customer),
      { bagInstanceId, quantity: 2, paymentMethod: 'cash' },
      Date.now(),
    );
    expect(await reservedQty(bagInstanceId)).toBe(2);

    const res = await cancelOrder(customer.id, order.id, undefined, Date.now());
    expect(res.status).toBe('cancelled_user');
    expect(res.refundDue).toBe(false); // cash : rien n'a été encaissé en ligne
    expect(await reservedQty(bagInstanceId)).toBe(0); // stock restitué exactement une fois

    // Une seconde annulation d'une commande déjà terminale est refusée (pas de re-libération).
    await expect(cancelOrder(customer.id, order.id, undefined, Date.now())).rejects.toThrow();
    expect(await reservedQty(bagInstanceId)).toBe(0);
  });

  // NB : la protection sous concurrence VRAIE (deux transactions lisant simultanément
  // 'reserved') repose sur la transition conditionnelle `WHERE status = <lu>` de cancelOrder.
  // Elle n'est pas reproductible de façon fiable via un test in-process : le `findFirst`
  // hors-transaction de cancelOrder court-circuite (la 2e annulation lit déjà 'cancelled_user'
  // et lève), donc un `Promise.all([cancelOrder, cancelOrder])` sérialise et ne exerce jamais
  // la course. La concurrence réelle est déjà couverte ailleurs (verrou anti double-dépense C1
  // et garde de stock atomique anti-oversell, cf. money-auth.itest.ts).
});

describe('Paiement en ligne — garde anti sous-paiement fail-closed (M4)', () => {
  it("ne confirme JAMAIS la commande si l'encaissé est inférieur au dû", async () => {
    const customer = await createUser();
    const { storeId } = await createMerchantWithStore();
    const { bagInstanceId } = await createLiveBagInstance(storeId);
    const { orderId } = await insertPendingOnlineOrder({
      userId: customer.id,
      storeId,
      bagInstanceId,
      provider: 'konnect',
      providerRef: 'ref-underpaid',
      amountMinor: 10000,
    });

    await processPaymentEvent('konnect', {
      providerEventId: 'evt-underpaid',
      providerRef: 'ref-underpaid',
      status: 'succeeded',
      amountMinor: 5000, // sous-payé
      raw: {},
    });

    // Fail-closed : malgré un événement 'succeeded', la commande reste en attente de paiement.
    expect(await orderStatus(orderId)).toBe('pending_payment');
  });

  it("ne confirme pas non plus si le provider n'a pas fourni de montant encaissé", async () => {
    const customer = await createUser();
    const { storeId } = await createMerchantWithStore();
    const { bagInstanceId } = await createLiveBagInstance(storeId);
    const { orderId } = await insertPendingOnlineOrder({
      userId: customer.id,
      storeId,
      bagInstanceId,
      provider: 'konnect',
      providerRef: 'ref-noamount',
      amountMinor: 10000,
    });

    await processPaymentEvent('konnect', {
      providerEventId: 'evt-noamount',
      providerRef: 'ref-noamount',
      status: 'succeeded',
      // amountMinor omis → absent
      raw: {},
    });

    expect(await orderStatus(orderId)).toBe('pending_payment');
  });
});

describe('Paiement en ligne — confirmation & idempotence du webhook (M16)', () => {
  it('confirme sur montant exact puis ignore le rejeu du même événement', async () => {
    const customer = await createUser();
    const { storeId } = await createMerchantWithStore();
    const { bagInstanceId } = await createLiveBagInstance(storeId);
    const { orderId } = await insertPendingOnlineOrder({
      userId: customer.id,
      storeId,
      bagInstanceId,
      provider: 'konnect',
      providerRef: 'ref-idem',
      amountMinor: 10000,
    });

    const event = {
      providerEventId: 'evt-idem',
      providerRef: 'ref-idem',
      status: 'succeeded' as const,
      amountMinor: 10000,
      raw: {},
    };

    await processPaymentEvent('konnect', event);
    expect(await orderStatus(orderId)).toBe('reserved'); // pending_payment → reserved

    // Rejeu du MÊME événement (retry provider) : dédup sur (provider, provider_event_id).
    await processPaymentEvent('konnect', event);
    expect(await orderStatus(orderId)).toBe('reserved');

    const sql = getSql();
    const rows = (await sql`
      SELECT COUNT(*)::int AS n FROM payment_events WHERE provider_event_id = 'evt-idem'
    `) as unknown as Array<{ n: number }>;
    expect(Number(rows[0]!.n)).toBe(1); // traité exactement une fois
  });
});
