import { and, eq, sql } from 'drizzle-orm';
import { orders, payments, bagInstances, stores, creditsLedger } from '@baraka/db';
import {
  initialStatus,
  applyEvent,
  evaluateUserCancellation,
  evaluateStoreCancellation,
  multiplyByQuantity,
  money,
  clampToZero,
  subtract,
  type CreateOrderInput,
  type Currency,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from '@baraka/shared';
import { getDb, getSql } from '../../lib/db';
import { getStorage } from '../../lib/storage';
import { errors } from '../../lib/errors';
import { generatePickupCode, formatOrderNumber } from '../../lib/ids';
import { SETTINGS } from '../../config/settings';
import { getPaymentProvider, enabledPaymentMethods } from '../payments/registry';
import { env } from '../../config/env';
import { sse } from '../../lib/sse';
import { notifyUserI18n } from '../notifications/service';
import { updateUserStatsOnPickup, maybeRewardReferral } from '../engagement/service';
import { requireActiveMerchant } from '../merchant/guard';
import { issueRefundForOrder } from '../payments/service';

type Row = Record<string, unknown>;

function mapOrderRow(r: Row): Order {
  const currency = String(r.currency) as Currency;
  const imageKey = r.image_key ? String(r.image_key) : null;
  return {
    id: String(r.id),
    number: String(r.number),
    status: r.status as OrderStatus,
    paymentMethod: r.payment_method as PaymentMethod,
    quantity: Number(r.quantity),
    unitPrice: { amountMinor: Number(r.unit_price_minor), currency },
    total: { amountMinor: Number(r.total_minor), currency },
    creditApplied: { amountMinor: Number(r.credit_applied_minor), currency },
    pickupCode: r.pickup_code ? String(r.pickup_code) : null,
    storeId: String(r.store_id),
    storeSlug: String(r.store_slug),
    storeName: String(r.store_name),
    bagTitle: String(r.bag_title),
    imageUrl: imageKey ? getStorage().urlForKey(imageKey) : null,
    pickupStartAt: new Date(r.pickup_start_at as string).toISOString(),
    pickupEndAt: new Date(r.pickup_end_at as string).toISOString(),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

/** Historique enrichi des commandes d'un client (contrat `Order`). */
export async function listUserOrders(userId: string): Promise<Order[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      o.id, o.number, o.status, o.payment_method, o.quantity,
      o.unit_price_minor, o.total_minor, o.credit_applied_minor, o.currency,
      o.pickup_code, o.store_id, o.created_at,
      s.slug AS store_slug, s.name AS store_name,
      bt.name AS bag_title, bt.image_key AS image_key,
      bi.pickup_start_at, bi.pickup_end_at
    FROM orders o
    JOIN stores s         ON s.id = o.store_id
    JOIN bag_instances bi ON bi.id = o.bag_instance_id
    JOIN bag_templates bt ON bt.id = bi.bag_template_id
    WHERE o.user_id = ${userId}
    ORDER BY o.created_at DESC
    LIMIT 50
  `) as unknown as Row[];
  return rows.map(mapOrderRow);
}

/** Détail enrichi d'une commande (propriété vérifiée par userId). */
export async function getUserOrder(userId: string, orderId: string): Promise<Order | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      o.id, o.number, o.status, o.payment_method, o.quantity,
      o.unit_price_minor, o.total_minor, o.credit_applied_minor, o.currency,
      o.pickup_code, o.store_id, o.created_at,
      s.slug AS store_slug, s.name AS store_name,
      bt.name AS bag_title, bt.image_key AS image_key,
      bi.pickup_start_at, bi.pickup_end_at
    FROM orders o
    JOIN stores s         ON s.id = o.store_id
    JOIN bag_instances bi ON bi.id = o.bag_instance_id
    JOIN bag_templates bt ON bt.id = bi.bag_template_id
    WHERE o.id = ${orderId} AND o.user_id = ${userId}
    LIMIT 1
  `) as unknown as Row[];
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

/** Réserve un panier de façon atomique et crée la commande. */
export async function createOrder(
  user: { id: string; email: string; name: string; phone?: string | null },
  input: CreateOrderInput,
  nowMs: number,
) {
  const db = getDb();
  const qty = input.quantity;

  // 0) Refuse tôt une méthode de paiement non activée : sinon la garde de stock réserve
  //    puis getPaymentProvider lève, laissant une commande + du stock orphelins.
  if (!enabledPaymentMethods().includes(input.paymentMethod)) {
    throw errors.badRequest(`Moyen de paiement « ${input.paymentMethod} » indisponible.`);
  }
  const method = input.paymentMethod;

  // Numéro de commande via la séquence (hors transaction : nextval n'est pas annulé
  // par un rollback, donc jamais de réutilisation de numéro).
  const year = new Date(nowMs).getUTCFullYear();
  const seqRows = (await getSql()`SELECT nextval('order_number_seq') AS seq`) as unknown as Array<{
    seq: string | number;
  }>;
  const number = formatOrderNumber(year, Number(seqRows[0]!.seq));

  // Réservation + commande + débit crédits dans UNE transaction : un échec en aval
  // (débit, insertion) rollback aussi la réservation → aucun stock orphelin (M1).
  const { order, amountToPay, needsOnlinePayment } = await db.transaction(async (tx) => {
    // 0) Verrou consultatif par utilisateur, tenu jusqu'à la fin de la transaction :
    //    sérialise les créations de commande concurrentes du MÊME client, sinon deux
    //    requêtes parallèles lisent le même solde de crédits et le dépensent deux fois (C1).
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`);

    // 1) Garde de stock atomique via update conditionnel : 0 ligne ⇒ épuisé (anti-oversell).
    const reservedRows = await tx
      .update(bagInstances)
      .set({
        quantityReserved: sql`${bagInstances.quantityReserved} + ${qty}`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(bagInstances.id, input.bagInstanceId),
          eq(bagInstances.status, 'live'),
          sql`${bagInstances.quantityReserved} + ${bagInstances.quantitySold} + ${qty} <= ${bagInstances.quantityTotal}`,
          // La boutique doit être active ET son commerçant approuvé : on ne vend jamais pour
          // un commerçant suspendu / une boutique en pause, même si l'instance est 'live' (H1).
          sql`EXISTS (SELECT 1 FROM stores s JOIN merchants m ON m.id = s.merchant_id
                      WHERE s.id = ${bagInstances.storeId} AND s.status = 'active' AND m.status = 'approved')`,
        ),
      )
      .returning({
        storeId: bagInstances.storeId,
        priceMinor: bagInstances.priceMinor,
        currency: bagInstances.currency,
      });
    if (reservedRows.length === 0) throw errors.soldOut('Ce panier vient d’être épuisé.');
    const inst = reservedRows[0]!;
    const currency = inst.currency as Currency;
    const unitPrice = money(inst.priceMinor, currency);
    const total = multiplyByQuantity(unitPrice, qty);

    // 2) Crédits : plafonnés au solde disponible et au total. Le solde est lu DANS la
    //    transaction (et non sur une connexion autocommit) : combiné au verrou ci-dessus,
    //    aucune fenêtre de double-dépense (C1).
    const requestedCredit = input.useCreditMinor ?? 0;
    let creditApplied = 0;
    if (requestedCredit > 0) {
      const balRows = (await tx.execute(sql`
        SELECT COALESCE(SUM(delta_minor), 0) AS balance FROM credits_ledger
        WHERE user_id = ${user.id} AND currency = ${currency}
      `)) as unknown as Row[];
      const balance = Number(balRows[0]?.balance ?? 0);
      creditApplied = Math.max(0, Math.min(requestedCredit, total.amountMinor, balance));
    }
    const amount = clampToZero(subtract(total, money(creditApplied, currency)));

    // 3) Statut : règlement en ligne uniquement s'il reste un net à payer ; sinon
    //    (cash OU couvert à 100 % par crédit) la commande est réservée directement (M5).
    const needsPay = method !== 'cash' && amount.amountMinor > 0;
    const holdExpiresAt = needsPay ? new Date(nowMs + SETTINGS.paymentHoldMinutes * 60_000) : null;

    const [created] = await tx
      .insert(orders)
      .values({
        number,
        userId: user.id,
        bagInstanceId: input.bagInstanceId,
        storeId: inst.storeId,
        quantity: qty,
        unitPriceMinor: unitPrice.amountMinor,
        totalMinor: total.amountMinor,
        creditAppliedMinor: creditApplied,
        currency,
        paymentMethod: method,
        status: needsPay ? initialStatus(method) : 'reserved',
        pickupCode: generatePickupCode(),
        expiresAt: holdExpiresAt,
        reservedAt: needsPay ? null : new Date(nowMs),
      })
      .returning();
    if (!created) throw errors.internal('Création de commande échouée.');

    // Débit du grand livre : sans cette écriture le solde (SUM(delta_minor)) ne
    // décroît jamais et un même crédit serait réutilisable à l'infini (C2).
    if (creditApplied > 0) {
      await tx.insert(creditsLedger).values({
        userId: user.id,
        deltaMinor: -creditApplied,
        currency,
        reason: 'redeemed',
        orderId: created.id,
      });
    }
    return { order: created, amountToPay: amount, needsOnlinePayment: needsPay };
  });

  const currency = order.currency as Currency;

  // 4) Paiement en ligne le cas échéant (appel réseau au provider, hors transaction).
  let payment: {
    kind: 'none' | 'redirect' | 'client_secret';
    redirectUrl?: string;
    clientSecret?: string;
    expiresAt?: string;
  } = {
    kind: 'none',
  };

  if (needsOnlinePayment) {
    const provider = getPaymentProvider(method);
    const result = await provider.createPayment({
      orderId: order.id,
      orderNumber: number,
      amountMinor: amountToPay.amountMinor,
      currency,
      returnUrl: `${env.PUBLIC_WEB_URL}/order/${order.id}`,
      webhookUrl: `${env.PUBLIC_API_URL}/v1/payments/webhooks/${method}`,
      customer: { id: user.id, email: user.email, name: user.name, phone: user.phone },
    });

    const providerRef = result.kind === 'none' ? null : result.providerRef;
    await db.insert(payments).values({
      orderId: order.id,
      provider: method,
      providerRef,
      amountMinor: amountToPay.amountMinor,
      currency,
      status: 'pending',
      checkoutUrl: result.kind === 'redirect' ? result.url : null,
      idempotencyKey: `pay_${order.id}`,
    });

    if (result.kind === 'redirect') {
      payment = {
        kind: 'redirect',
        redirectUrl: result.url,
        expiresAt: order.expiresAt?.toISOString(),
      };
    } else if (result.kind === 'client_secret') {
      payment = {
        kind: 'client_secret',
        clientSecret: result.secret,
        expiresAt: order.expiresAt?.toISOString(),
      };
    }
  } else {
    // Réservé immédiatement (cash OU couvert à 100 % par crédit) — notifie magasin + client.
    sse.publish(`store:${order.storeId}`, 'order.reserved', { orderId: order.id, number });
    await notifyUserI18n(
      user.id,
      'order_update',
      'order_reserved',
      { number },
      {
        orderId: order.id,
      },
    );
  }

  return { order, payment };
}

/** Annulation par le client (avec politique de fenêtre + remboursement). */
export async function cancelOrder(
  userId: string,
  orderId: string,
  reason: string | undefined,
  nowMs: number,
) {
  const db = getDb();
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
  if (!order) throw errors.notFound('Commande introuvable.');

  const instance = await db.query.bagInstances.findFirst({
    where: eq(bagInstances.id, order.bagInstanceId),
  });
  const pickupStartMs = instance ? new Date(instance.pickupStartAt).getTime() : nowMs;

  const outcome = evaluateUserCancellation({
    status: order.status,
    paymentMethod: order.paymentMethod,
    pickupStartAtMs: pickupStartMs,
    nowMs,
    cancellationWindowMinutes: SETTINGS.cancellationWindowMinutes,
  });
  if (!outcome.allowed) {
    if (outcome.denyReason === 'too_late') {
      throw errors.tooLate('Trop tard pour annuler cette commande.');
    }
    throw errors.conflict('Cette commande ne peut plus être annulée.');
  }

  const nextStatus = applyEvent(order.status, 'user_cancel');
  // Transition CONDITIONNELLE sur le statut lu : deux annulations concurrentes ne peuvent
  // pas toutes deux libérer le stock ET déclencher un remboursement (H2).
  const applied = await db.transaction(async (tx) => {
    const rows = await tx
      .update(orders)
      .set({ status: nextStatus, cancelledAt: new Date(nowMs), cancelReason: reason ?? null })
      .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
      .returning({ id: orders.id });
    if (rows.length === 0) return false; // une autre requête a déjà annulé cette commande
    await tx.execute(
      sql`UPDATE bag_instances SET quantity_reserved = GREATEST(quantity_reserved - ${order.quantity}, 0) WHERE id = ${order.bagInstanceId}`,
    );
    return true;
  });
  if (!applied) return { status: nextStatus, refundDue: false };

  sse.publish(`order:${orderId}`, 'order.cancelled', {
    orderId,
    status: nextStatus,
    refundDue: outcome.refundDue,
  });
  sse.publish(`store:${order.storeId}`, 'order.cancelled', { orderId, number: order.number });
  if (outcome.refundDue)
    await issueRefundForOrder(orderId, outcome.refundReason ?? 'user_cancelled');
  return { status: nextStatus, refundDue: outcome.refundDue };
}

/** Confirmation de retrait — self-swipe client OU validation commerçant par code. */
export async function confirmPickup(orderId: string, nowMs: number) {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw errors.notFound('Commande introuvable.');

  const nextStatus = applyEvent(order.status, 'validate_pickup'); // lève si état illégal
  const applied = await db.transaction(async (tx) => {
    // Update CONDITIONNEL sur le statut lu : ferme la fenêtre TOCTOU (deux retraits
    // concurrents comptaient sinon quantity_sold en double + double stats/parrainage).
    const rows = await tx
      .update(orders)
      .set({ status: nextStatus, pickedUpAt: new Date(nowMs) })
      .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
      .returning({ id: orders.id });
    if (rows.length === 0) return false; // un autre appel a déjà transité la commande
    await tx.execute(
      sql`UPDATE bag_instances
          SET quantity_sold = quantity_sold + ${order.quantity},
              quantity_reserved = GREATEST(quantity_reserved - ${order.quantity}, 0)
          WHERE id = ${order.bagInstanceId}`,
    );
    return true;
  });
  if (!applied) return { status: nextStatus };

  sse.publish(`order:${orderId}`, 'order.picked_up', { orderId, status: nextStatus });
  sse.publish(`store:${order.storeId}`, 'order.picked_up', { orderId, number: order.number });

  // Impact + récompense de parrainage (premier retrait du filleul).
  await updateUserStatsOnPickup(order.userId, {
    quantity: order.quantity,
    totalMinor: order.totalMinor,
    bagInstanceId: order.bagInstanceId,
  });
  await maybeRewardReferral(order.userId);

  return { status: nextStatus };
}

/** Validation commerçant : retrouve la commande par code de retrait dans une de ses boutiques. */
export async function validatePickupByCode(merchantUserId: string, code: string, nowMs: number) {
  const db = getDb();
  // Le validateur DOIT être un commerçant ACTIF (non suspendu) ; on ne retrouve la commande
  // que parmi SES boutiques — empêche tout utilisateur de valider/brute-forcer les retraits d'autrui.
  const ctx = await requireActiveMerchant(merchantUserId);
  const found = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(stores, eq(stores.id, orders.storeId))
    .where(
      and(
        eq(orders.pickupCode, code),
        eq(orders.status, 'reserved'),
        eq(stores.merchantId, ctx.merchantId),
      ),
    )
    .limit(1);

  const target = found[0];
  if (!target) throw errors.notFound('Code invalide ou commande déjà traitée.');
  return confirmPickup(target.id, nowMs);
}

/** Annulation d'une commande par le magasin (remboursement intégral si payé en ligne). */
export async function storeCancelOrder(orderId: string, nowMs: number) {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw errors.notFound('Commande introuvable.');

  const outcome = evaluateStoreCancellation({
    status: order.status,
    paymentMethod: order.paymentMethod,
  });
  if (!outcome.allowed) throw errors.conflict('Commande non annulable.');

  const nextStatus = applyEvent(order.status, 'store_cancel');
  // Transition conditionnelle (idem cancelOrder) : évite double libération de stock /
  // double remboursement sous annulations concurrentes (H2).
  const applied = await db.transaction(async (tx) => {
    const rows = await tx
      .update(orders)
      .set({
        status: nextStatus,
        cancelledAt: new Date(nowMs),
        cancelReason: 'Annulé par le commerçant',
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
      .returning({ id: orders.id });
    if (rows.length === 0) return false;
    await tx.execute(
      sql`UPDATE bag_instances SET quantity_reserved = GREATEST(quantity_reserved - ${order.quantity}, 0) WHERE id = ${order.bagInstanceId}`,
    );
    return true;
  });
  if (!applied) return { status: nextStatus, refundDue: false };

  sse.publish(`order:${orderId}`, 'order.cancelled', {
    orderId,
    status: nextStatus,
    refundDue: outcome.refundDue,
  });
  sse.publish(`store:${order.storeId}`, 'order.cancelled', { orderId, number: order.number });
  await notifyUserI18n(
    order.userId,
    'order_update',
    'order_cancelled_store',
    {},
    {
      orderId,
    },
  );
  if (outcome.refundDue)
    await issueRefundForOrder(orderId, outcome.refundReason ?? 'store_cancelled');
  return { status: nextStatus, refundDue: outcome.refundDue };
}
