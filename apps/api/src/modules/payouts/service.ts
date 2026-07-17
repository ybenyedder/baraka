import { and, desc, eq, sql } from 'drizzle-orm';
import { payouts } from '@baraka/db';
import { getDb } from '../../lib/db';
import { errors } from '../../lib/errors';
import { requireMerchant } from '../merchant/guard';

type Row = Record<string, unknown>;

/**
 * Génère les brouillons de payouts pour une période (commandes retirées non encore
 * incluses dans un payout). Commission = total × commission_bps du commerçant.
 *
 * Deux flux distincts :
 *  - en ligne : la plateforme a encaissé le brut → elle doit au commerçant `brut − commission` (net positif) ;
 *  - espèces  : le commerçant a déjà encaissé le brut en main propre → la plateforme lui FACTURE
 *    la commission (net NÉGATIF, dette déduite du versement) — sans quoi elle paierait deux fois (C2).
 *
 * L'entête est recalculé depuis la somme réelle des lignes (M5 : jamais de total périmé si la
 * génération est relancée en cours de période). Le tout dans une transaction.
 */
export async function generatePayoutDrafts(
  periodStart: string,
  periodEnd: string,
): Promise<number> {
  const db = getDb();
  return db.transaction(async (tx) => {
    // 1) Entête brouillon (à 0) pour chaque commerçant ayant des commandes retirées non encore
    //    rattachées. Les montants sont recalculés à l'étape 3.
    const created = (await tx.execute(sql`
      INSERT INTO payouts (merchant_id, period_start, period_end, gross_minor, commission_minor, net_minor, currency, status)
      SELECT m.id, ${periodStart}::date, ${periodEnd}::date, 0, 0, 0, 'TND', 'draft'
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      JOIN merchants m ON m.id = s.merchant_id
      WHERE o.status = 'picked_up'
        AND o.picked_up_at::date BETWEEN ${periodStart}::date AND ${periodEnd}::date
        AND NOT EXISTS (SELECT 1 FROM payout_items pi WHERE pi.order_id = o.id)
      GROUP BY m.id
      ON CONFLICT (merchant_id, period_start, period_end) DO NOTHING
      RETURNING id
    `)) as unknown as Row[];

    // 2) Lignes (une par commande). Net cash négatif (dette de commission), net en ligne positif.
    await tx.execute(sql`
      INSERT INTO payout_items (payout_id, order_id, gross_minor, commission_minor, net_minor)
      SELECT p.id, o.id, o.total_minor,
             ROUND(o.total_minor * m.commission_bps / 10000.0)::int,
             CASE WHEN o.payment_method = 'cash'
                  THEN -ROUND(o.total_minor * m.commission_bps / 10000.0)::int
                  ELSE o.total_minor - ROUND(o.total_minor * m.commission_bps / 10000.0)::int
             END
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      JOIN merchants m ON m.id = s.merchant_id
      JOIN payouts p ON p.merchant_id = m.id AND p.period_start = ${periodStart}::date
                     AND p.period_end = ${periodEnd}::date AND p.status = 'draft'
      WHERE o.status = 'picked_up'
        AND o.picked_up_at::date BETWEEN ${periodStart}::date AND ${periodEnd}::date
        AND NOT EXISTS (SELECT 1 FROM payout_items pi WHERE pi.order_id = o.id)
    `);

    // 3) Entête = somme réelle des lignes (cohérence garantie même en régénération).
    await tx.execute(sql`
      UPDATE payouts p SET
        gross_minor = agg.gross, commission_minor = agg.commission, net_minor = agg.net, updated_at = now()
      FROM (
        SELECT payout_id,
               SUM(gross_minor)::int AS gross,
               SUM(commission_minor)::int AS commission,
               SUM(net_minor)::int AS net
        FROM payout_items GROUP BY payout_id
      ) agg
      WHERE p.id = agg.payout_id AND p.status = 'draft'
        AND p.period_start = ${periodStart}::date AND p.period_end = ${periodEnd}::date
    `);

    return created.length;
  });
}

export async function listMyPayouts(userId: string) {
  const ctx = await requireMerchant(userId);
  return getDb().query.payouts.findMany({
    where: eq(payouts.merchantId, ctx.merchantId),
    orderBy: desc(payouts.periodEnd),
  });
}

export async function listAllPayouts() {
  return getDb().query.payouts.findMany({ orderBy: desc(payouts.createdAt) });
}

export async function approvePayout(id: string) {
  // Transition conditionnelle et atomique (draft → approved) : pas de check-then-act.
  const updated = await getDb()
    .update(payouts)
    .set({ status: 'approved' })
    .where(and(eq(payouts.id, id), eq(payouts.status, 'draft')))
    .returning({ id: payouts.id });
  if (updated.length === 0) {
    const exists = await getDb().query.payouts.findFirst({ where: eq(payouts.id, id) });
    if (!exists) throw errors.notFound('Payout introuvable.');
    throw errors.conflict('Seul un payout en brouillon peut être approuvé.');
  }
}

export async function markPayoutPaid(id: string, bankReference: string) {
  const updated = await getDb()
    .update(payouts)
    .set({ status: 'paid', paidAt: new Date(), bankReference })
    .where(and(eq(payouts.id, id), eq(payouts.status, 'approved')))
    .returning({ id: payouts.id });
  if (updated.length === 0) {
    const exists = await getDb().query.payouts.findFirst({ where: eq(payouts.id, id) });
    if (!exists) throw errors.notFound('Payout introuvable.');
    throw errors.conflict('Seul un payout approuvé peut être marqué payé.');
  }
}
