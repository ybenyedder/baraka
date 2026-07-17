import { randomUUID } from 'node:crypto';
import { getSql } from '../lib/db';

/**
 * Helpers de seed pour les tests d'intégration. Insertions en SQL brut (indépendantes des
 * services applicatifs) pour poser un état de départ contrôlé, puis on exerce les VRAIS
 * services par-dessus. Tout est isolé par `resetDb()` avant chaque test.
 */

/**
 * Tables vidées entre les tests. On liste aussi celles atteintes par CASCADE (accounts,
 * sessions…) pour un TRUNCATE explicite et silencieux (pas de NOTICE de cascade).
 */
const TABLES = [
  'payout_items',
  'payouts',
  'refunds',
  'payment_events',
  'payments',
  'credits_ledger',
  'referral_events',
  'reviews',
  'favorites',
  'notifications',
  'notification_prefs',
  'devices',
  'user_stats',
  'orders',
  'bag_instances',
  'bag_schedules',
  'bag_templates',
  'merchant_members',
  'moderation_reports',
  'stores',
  'merchants',
  'admin_audit_log',
  'accounts',
  'sessions',
  'users',
];

export async function resetDb(): Promise<void> {
  const sql = getSql();
  await sql.unsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

export async function createUser(
  opts: {
    role?: 'customer' | 'merchant' | 'admin';
    name?: string;
  } = {},
): Promise<{ id: string; email: string; name: string }> {
  const sql = getSql();
  const id = randomUUID();
  const email = `u_${id.slice(0, 8)}@test.local`;
  const name = opts.name ?? 'Test User';
  const referral = `R${id.slice(0, 8).toUpperCase()}`;
  await sql`
    INSERT INTO users (id, email, name, referral_code, role, locale)
    VALUES (${id}, ${email}, ${name}, ${referral}, ${opts.role ?? 'customer'}, 'fr')
  `;
  return { id, email, name };
}

export async function createMerchantWithStore(
  opts: {
    status?: 'pending' | 'approved' | 'rejected' | 'suspended';
    storeStatus?: 'draft' | 'active' | 'paused' | 'archived';
    commissionBps?: number;
  } = {},
): Promise<{ merchantId: string; storeId: string; ownerUserId: string }> {
  const sql = getSql();
  const owner = await createUser({ role: 'merchant', name: 'Owner' });
  const merchantId = randomUUID();
  const storeId = randomUUID();
  await sql`
    INSERT INTO merchants (id, legal_name, contact_email, status, commission_bps)
    VALUES (${merchantId}, 'Test SARL', ${owner.email}, ${opts.status ?? 'approved'}, ${opts.commissionBps ?? 1500})
  `;
  await sql`
    INSERT INTO merchant_members (merchant_id, user_id, role)
    VALUES (${merchantId}, ${owner.id}, 'owner')
  `;
  await sql`
    INSERT INTO stores (id, merchant_id, slug, name, address_line, city, location, status)
    VALUES (
      ${storeId}, ${merchantId}, ${'store-' + storeId.slice(0, 8)}, 'Boutique Test',
      '1 rue du Test', 'Tunis',
      ST_SetSRID(ST_MakePoint(10.18, 36.80), 4326)::geography,
      ${opts.storeStatus ?? 'active'}
    )
  `;
  return { merchantId, storeId, ownerUserId: owner.id };
}

export async function createLiveBagInstance(
  storeId: string,
  opts: {
    quantity?: number;
    priceMinor?: number;
    originalMinor?: number;
    /** Délai avant le début du créneau de retrait (heures). Défaut 2 ; augmenter pour rester
     *  dans la fenêtre d'annulation (SETTINGS.cancellationWindowMinutes = 120). */
    pickupInHours?: number;
  } = {},
): Promise<{ bagInstanceId: string; templateId: string }> {
  const sql = getSql();
  const templateId = randomUUID();
  const bagInstanceId = randomUUID();
  const price = opts.priceMinor ?? 1000;
  const original = opts.originalMinor ?? price * 3;
  const startH = opts.pickupInHours ?? 2;
  await sql`
    INSERT INTO bag_templates (id, store_id, name, price_minor, original_value_minor)
    VALUES (${templateId}, ${storeId}, 'Panier Surprise', ${price}, ${original})
  `;
  await sql`
    INSERT INTO bag_instances (
      id, bag_template_id, store_id, date, pickup_start_at, pickup_end_at,
      quantity_total, price_minor, original_value_minor, status
    ) VALUES (
      ${bagInstanceId}, ${templateId}, ${storeId}, current_date,
      now() + make_interval(hours => ${startH}), now() + make_interval(hours => ${startH + 2}),
      ${opts.quantity ?? 5}, ${price}, ${original}, 'live'
    )
  `;
  return { bagInstanceId, templateId };
}

/**
 * Insère une commande EN LIGNE en attente de paiement (`pending_payment`) avec son
 * paiement `pending` — pour tester le traitement des événements de paiement
 * (garde anti sous-paiement, idempotence webhook) sans provider réseau.
 */
export async function insertPendingOnlineOrder(opts: {
  userId: string;
  storeId: string;
  bagInstanceId: string;
  provider: 'konnect' | 'stripe';
  providerRef: string;
  amountMinor: number;
}): Promise<{ orderId: string; paymentId: string }> {
  const sql = getSql();
  const orderId = randomUUID();
  const paymentId = randomUUID();
  const number = `TEST-${orderId.slice(0, 8)}`;
  await sql`
    INSERT INTO orders (
      id, number, user_id, bag_instance_id, store_id, quantity,
      unit_price_minor, total_minor, credit_applied_minor, currency, payment_method, status
    ) VALUES (
      ${orderId}, ${number}, ${opts.userId}, ${opts.bagInstanceId}, ${opts.storeId}, 1,
      ${opts.amountMinor}, ${opts.amountMinor}, 0, 'TND', ${opts.provider}, 'pending_payment'
    )
  `;
  await sql`
    INSERT INTO payments (
      id, order_id, provider, provider_ref, amount_minor, currency, status, idempotency_key
    ) VALUES (
      ${paymentId}, ${orderId}, ${opts.provider}, ${opts.providerRef},
      ${opts.amountMinor}, 'TND', 'pending', ${'pay_' + orderId}
    )
  `;
  return { orderId, paymentId };
}

/** Statut courant d'une commande. */
export async function orderStatus(orderId: string): Promise<string> {
  const sql = getSql();
  const rows = (await sql`
    SELECT status FROM orders WHERE id = ${orderId}
  `) as unknown as Array<{ status: string }>;
  return String(rows[0]?.status);
}

export async function grantCredit(userId: string, amountMinor: number): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO credits_ledger (user_id, delta_minor, currency, reason)
    VALUES (${userId}, ${amountMinor}, 'TND', 'admin_adjust')
  `;
}

export async function creditBalance(userId: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT COALESCE(SUM(delta_minor), 0) AS balance FROM credits_ledger WHERE user_id = ${userId}
  `) as unknown as Array<{ balance: string | number }>;
  return Number(rows[0]?.balance ?? 0);
}

export async function reservedQty(bagInstanceId: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT quantity_reserved FROM bag_instances WHERE id = ${bagInstanceId}
  `) as unknown as Array<{ quantity_reserved: number }>;
  return Number(rows[0]?.quantity_reserved ?? 0);
}

/** Insère une commande déjà retirée (pour tester la génération de payouts sans provider). */
export async function insertPickedUpOrder(opts: {
  userId: string;
  storeId: string;
  bagInstanceId: string;
  paymentMethod: 'cash' | 'konnect' | 'stripe';
  totalMinor: number;
}): Promise<string> {
  const sql = getSql();
  const orderId = randomUUID();
  const number = `TEST-${orderId.slice(0, 8)}`;
  await sql`
    INSERT INTO orders (
      id, number, user_id, bag_instance_id, store_id, quantity,
      unit_price_minor, total_minor, credit_applied_minor, currency,
      payment_method, status, picked_up_at
    ) VALUES (
      ${orderId}, ${number}, ${opts.userId}, ${opts.bagInstanceId}, ${opts.storeId}, 1,
      ${opts.totalMinor}, ${opts.totalMinor}, 0, 'TND',
      ${opts.paymentMethod}, 'picked_up', now()
    )
  `;
  return orderId;
}
