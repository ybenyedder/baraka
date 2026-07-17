import PgBoss from 'pg-boss';
import { pathToFileURL } from 'node:url';
import { env } from './config/env';
import { getSql, closeDb } from './lib/db';
import { generateInstances } from './modules/catalog/service';
import { sendPickupReminders } from './modules/notifications/service';
import { reconcilePayments, reconcileRefunds } from './modules/payments/service';
import { notifyFavoritesNewBags, sendReviewRequests } from './modules/engagement/service';

/** Exécute une étape de maintenance en isolant son échec : une exception ne doit jamais
 *  empêcher les étapes suivantes du cycle (notamment la libération de stock). */
async function runStep(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[worker] étape « ${name} » en échec (les autres continuent) :`, err);
  }
}

/**
 * Worker de jobs (pg-boss, sur Postgres — pas de Redis).
 * Jobs planifiés : libération des retenues expirées, passage scheduled→live,
 * clôture ended/no_show. Les jobs de push/stats/réconciliation viendront en M2+.
 */
async function ensureQueue(boss: PgBoss, name: string): Promise<void> {
  try {
    await boss.createQueue(name);
  } catch {
    // La file existe déjà — ignore.
  }
}

async function releaseExpiredHolds(): Promise<void> {
  const sql = getSql();
  // Commandes en attente de paiement expirées → payment_failed + libération du stock.
  const expired = (await sql`
    UPDATE orders SET status = 'payment_failed'
    WHERE status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at < now()
    RETURNING bag_instance_id, quantity
  `) as unknown as Array<{ bag_instance_id: string; quantity: number }>;
  for (const row of expired) {
    await sql`UPDATE bag_instances SET quantity_reserved = GREATEST(quantity_reserved - ${row.quantity}, 0) WHERE id = ${row.bag_instance_id}`;
  }
}

async function promoteAndCloseInstances(): Promise<void> {
  const sql = getSql();
  // scheduled → live quand le créneau a commencé (et pas encore fini).
  await sql`
    UPDATE bag_instances SET status = 'live'
    WHERE status = 'scheduled' AND pickup_start_at <= now() AND pickup_end_at > now()
  `;
  // live → ended quand le créneau est passé.
  await sql`UPDATE bag_instances SET status = 'ended' WHERE status = 'live' AND pickup_end_at <= now()`;
  // sold_out si plus rien de disponible.
  await sql`
    UPDATE bag_instances SET status = 'sold_out'
    WHERE status = 'live' AND (quantity_total - quantity_reserved - quantity_sold) <= 0
  `;
}

async function markNoShows(): Promise<void> {
  const sql = getSql();
  // reserved mais créneau terminé depuis > 1h → no_show + strike cash.
  const noShows = (await sql`
    UPDATE orders SET status = 'no_show'
    WHERE status = 'reserved'
      AND bag_instance_id IN (SELECT id FROM bag_instances WHERE pickup_end_at < now() - interval '1 hour')
    RETURNING user_id, payment_method, bag_instance_id, quantity
  `) as unknown as Array<{
    user_id: string;
    payment_method: string;
    bag_instance_id: string;
    quantity: number;
  }>;
  for (const row of noShows) {
    // Libère le stock réservé du no-show (sinon quantity_reserved reste gonflé indéfiniment).
    await sql`UPDATE bag_instances SET quantity_reserved = GREATEST(quantity_reserved - ${row.quantity}, 0) WHERE id = ${row.bag_instance_id}`;
    if (row.payment_method === 'cash') {
      await sql`UPDATE users SET no_show_count = no_show_count + 1 WHERE id = ${row.user_id}`;
    }
  }
}

async function start(): Promise<void> {
  const boss = new PgBoss(env.DATABASE_URL);
  boss.on('error', (err) => console.error('pg-boss error', err));
  await boss.start();

  // File STOCK/PAIEMENTS (critique) : chaque étape isolée (L3) ; le fan-out de push en est
  // exclu pour qu'un Expo lent ne retarde jamais la libération de stock (H7).
  const MAINT = 'baraka-maintenance';
  await ensureQueue(boss, MAINT);
  await boss.work(MAINT, async () => {
    await runStep('releaseExpiredHolds', releaseExpiredHolds);
    await runStep('promoteAndCloseInstances', promoteAndCloseInstances);
    await runStep('markNoShows', markNoShows);
    await runStep('reconcilePayments', reconcilePayments);
    await runStep('reconcileRefunds', reconcileRefunds);
  });
  await boss.schedule(MAINT, '* * * * *'); // maintenance chaque minute

  // File NOTIFICATIONS (fan-out push, séparée) : peut être lente sans impacter le stock.
  const NOTIF = 'baraka-notifications';
  await ensureQueue(boss, NOTIF);
  await boss.work(NOTIF, async () => {
    await runStep('sendPickupReminders', sendPickupReminders);
    await runStep('notifyFavoritesNewBags', notifyFavoritesNewBags);
    await runStep('sendReviewRequests', sendReviewRequests);
  });
  await boss.schedule(NOTIF, '* * * * *');

  // Génération des instances à J+7 : chaque nuit à 2 h.
  const NIGHTLY = 'baraka-nightly';
  await ensureQueue(boss, NIGHTLY);
  await boss.work(NIGHTLY, async () => {
    const created = await generateInstances(7);
    console.log(`  → ${created} instances de paniers générées.`);
  });
  await boss.schedule(NIGHTLY, '0 2 * * *');

  console.log('✓ Worker Baraka démarré (maintenance chaque minute).');

  const shutdown = async (): Promise<void> => {
    await boss.stop();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void start();
}
