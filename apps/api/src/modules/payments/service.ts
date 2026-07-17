import { and, eq, sql } from 'drizzle-orm';
import { payments, paymentEvents, orders, refunds } from '@baraka/db';
import { applyEvent, type PaymentMethod, type RefundReason, type Currency } from '@baraka/shared';
import { getDb, getSql } from '../../lib/db';
import { getPaymentProvider } from './registry';
import { sse } from '../../lib/sse';
import { notifyUserI18n } from '../notifications/service';
import type { NormalizedPaymentEvent, NormalizedStatus } from './provider';

/**
 * Applique un événement de paiement de façon IDEMPOTENTE.
 * Le premier verrou est l'insertion unique dans payment_events (provider, providerEventId).
 */
export async function processPaymentEvent(
  method: PaymentMethod,
  event: NormalizedPaymentEvent,
): Promise<void> {
  const db = getDb();

  const inserted = await db
    .insert(paymentEvents)
    .values({
      provider: method,
      providerEventId: event.providerEventId,
      payload: event.raw,
      processedAt: new Date(),
    })
    .onConflictDoNothing({ target: [paymentEvents.provider, paymentEvents.providerEventId] })
    .returning({ id: paymentEvents.id });
  if (inserted.length === 0) return; // déjà traité → rien à faire

  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.provider, method), eq(payments.providerRef, event.providerRef)),
  });
  if (!payment) return;

  await db
    .update(payments)
    .set({ status: mapToPaymentStatus(event.status) })
    .where(eq(payments.id, payment.id));

  const order = await db.query.orders.findFirst({ where: eq(orders.id, payment.orderId) });
  if (!order) return;

  if (event.status === 'succeeded') {
    // Garde anti sous-paiement, fail-CLOSED : un provider en ligne DOIT fournir le montant
    // encaissé ; s'il est absent OU inférieur au dû, on ne confirme jamais la commande (M4).
    if (
      method !== 'cash' &&
      (event.amountMinor == null || event.amountMinor < payment.amountMinor)
    ) {
      console.warn(
        `[payments] confirmation refusée pour ${payment.id} : encaissé ${event.amountMinor ?? 'absent'} < dû ${payment.amountMinor}`,
      );
      return;
    }
    try {
      const next = applyEvent(order.status, 'payment_succeeded');
      await db
        .update(orders)
        .set({ status: next, reservedAt: new Date() })
        .where(eq(orders.id, order.id));
      sse.publish(`order:${order.id}`, 'order.reserved', { orderId: order.id, status: next });
      sse.publish(`store:${order.storeId}`, 'order.reserved', {
        orderId: order.id,
        number: order.number,
      });
      await notifyUserI18n(
        order.userId,
        'order_update',
        'payment_confirmed',
        { number: order.number },
        {
          orderId: order.id,
        },
      );
    } catch {
      /* transition déjà appliquée : ignore */
    }
  } else if (event.status === 'failed') {
    try {
      const next = applyEvent(order.status, 'payment_failed');
      await db.transaction(async (tx) => {
        await tx.update(orders).set({ status: next }).where(eq(orders.id, order.id));
        await tx.execute(
          sql`UPDATE bag_instances SET quantity_reserved = GREATEST(quantity_reserved - ${order.quantity}, 0) WHERE id = ${order.bagInstanceId}`,
        );
      });
      sse.publish(`order:${order.id}`, 'order.payment_failed', { orderId: order.id, status: next });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Émet réellement le remboursement d'une commande payée en ligne : appelle le
 * provider, journalise dans `refunds`, et passe le paiement en 'refunded'.
 * Idempotent. Le cash n'a rien encaissé en ligne → aucun remboursement à émettre.
 */
export async function issueRefundForOrder(orderId: string, reason: RefundReason): Promise<void> {
  const db = getDb();
  const payment = await db.query.payments.findFirst({ where: eq(payments.orderId, orderId) });
  if (!payment || payment.provider === 'cash' || !payment.providerRef) return;

  // Claim atomique : seul l'appelant qui fait passer le paiement 'succeeded' → 'refunded'
  // émettra réellement le remboursement. Ferme la fenêtre de double-remboursement sous
  // annulations concurrentes ou retries (H2).
  const claimed = await db
    .update(payments)
    .set({ status: 'refunded' })
    .where(and(eq(payments.id, payment.id), eq(payments.status, 'succeeded')))
    .returning({ id: payments.id });
  if (claimed.length === 0) return; // déjà remboursé (ou paiement pas dans un état remboursable)

  let result: { status: 'succeeded' | 'failed' | 'pending'; providerRef?: string };
  try {
    result = await getPaymentProvider(payment.provider).refund(
      payment.providerRef,
      payment.amountMinor,
      payment.currency as Currency,
      `refund_${payment.id}`,
    );
  } catch {
    result = { status: 'failed' };
  }

  await db.insert(refunds).values({
    paymentId: payment.id,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    reason,
    status: result.status,
    providerRef: result.providerRef ?? null,
  });

  // Provider non confirmé : on relâche le claim (retour à 'succeeded') pour permettre un
  // nouvel essai via reconcileRefunds ; la clé d'idempotence évite un double débit réel.
  if (result.status !== 'succeeded') {
    await db.update(payments).set({ status: 'succeeded' }).where(eq(payments.id, payment.id));
  }
}

/**
 * Filet de réconciliation des remboursements DUS mais non aboutis : commande annulée, paiement
 * en ligne encore 'succeeded', et aucun remboursement en cours/réussi. Couvre à la fois les
 * échecs à rejouer ET les annulations en masse dont le remboursement est délégué ici (M14).
 * Rejoué périodiquement par le worker. Idempotent (claim + clé d'idempotence provider).
 */
export async function reconcileRefunds(): Promise<number> {
  const sqlClient = getSql();
  const stuck = (await sqlClient`
    SELECT p.order_id, o.status AS order_status
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.provider <> 'cash' AND p.status = 'succeeded'
      AND o.status IN ('cancelled_user', 'cancelled_store')
      AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id = p.id AND r.status IN ('pending', 'succeeded'))
    LIMIT 20
  `) as unknown as Array<{ order_id: string; order_status: string }>;

  let reconciled = 0;
  for (const row of stuck) {
    const reason: RefundReason =
      row.order_status === 'cancelled_store' ? 'store_cancelled' : 'user_cancelled';
    try {
      await issueRefundForOrder(row.order_id, reason);
      reconciled += 1;
    } catch {
      /* réessaiera au prochain passage */
    }
  }
  return reconciled;
}

/** Webhook Konnect (GET avec payment_ref) — on re-vérifie toujours via l'API. */
export async function handleKonnectWebhook(paymentRef: string): Promise<void> {
  const provider = getPaymentProvider('konnect');
  const event = await provider.parseWebhook(
    { 'x-konnect-payment-ref': paymentRef },
    Buffer.alloc(0),
  );
  await processPaymentEvent('konnect', event);
}

/** Webhook Stripe (POST corps brut). */
export async function handleStripeWebhook(
  rawBody: Buffer,
  headers: Record<string, string | undefined>,
): Promise<void> {
  const provider = getPaymentProvider('stripe');
  const event = await provider.parseWebhook(headers, rawBody);
  await processPaymentEvent('stripe', event);
}

function mapToPaymentStatus(s: NormalizedStatus) {
  return s; // NormalizedStatus ⊂ PaymentStatus (pending|succeeded|failed|refunded)
}

/**
 * Filet de réconciliation : ré-interroge le provider pour les paiements bloqués
 * en 'pending' depuis > 20 min (webhooks perdus). Appelé périodiquement par le worker.
 */
export async function reconcilePayments(): Promise<number> {
  const sqlClient = getSql();
  const stuck = (await sqlClient`
    SELECT id, provider, provider_ref FROM payments
    WHERE status = 'pending' AND provider <> 'cash' AND provider_ref IS NOT NULL
      AND updated_at < now() - interval '20 minutes'
    LIMIT 50
  `) as unknown as Array<{ id: string; provider: PaymentMethod; provider_ref: string }>;

  let reconciled = 0;
  for (const p of stuck) {
    try {
      const provider = getPaymentProvider(p.provider);
      const result = await provider.fetchStatus(p.provider_ref);
      if (result.status !== 'pending') {
        await processPaymentEvent(p.provider, {
          providerEventId: `recon_${p.provider_ref}_${result.status}`,
          providerRef: p.provider_ref,
          status: result.status,
          amountMinor: result.amountMinor,
          raw: { reconciled: true },
        });
        reconciled += 1;
      }
    } catch {
      /* provider injoignable — on réessaiera au prochain passage */
    }
  }
  return reconciled;
}
