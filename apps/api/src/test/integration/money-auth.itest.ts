import { beforeEach, describe, expect, it } from 'vitest';
import { getSql } from '../../lib/db';
import { createOrder, validatePickupByCode } from '../../modules/orders/service';
import { approveMerchant } from '../../modules/admin/service';
import { generatePayoutDrafts } from '../../modules/payouts/service';
import {
  resetDb,
  createUser,
  createMerchantWithStore,
  createLiveBagInstance,
  grantCredit,
  creditBalance,
  reservedQty,
  insertPickedUpOrder,
} from '../helpers';

/**
 * Tests d'intégration des chemins ARGENT / AUTORISATION / CONCURRENCE — le trou récurrent
 * des deux audits (aucun test ne couvrait ces invariants). Exécutés contre une vraie PostGIS
 * via `pnpm --filter @baraka/api test:integration`.
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

describe('Crédits — anti double-dépense (C1)', () => {
  it('ne dépense jamais plus que le solde, même sous 5 réservations concurrentes du même client', async () => {
    const customer = await createUser();
    const { storeId } = await createMerchantWithStore();
    // 5 paniers dispos à 1000 millimes, 1000 de crédit : au plus UNE commande peut être
    // couverte par le crédit — les 4 autres doivent le voir déjà épuisé.
    const { bagInstanceId } = await createLiveBagInstance(storeId, {
      quantity: 5,
      priceMinor: 1000,
    });
    await grantCredit(customer.id, 1000);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        createOrder(
          asCustomer(customer),
          { bagInstanceId, quantity: 1, paymentMethod: 'cash', useCreditMinor: 1000 },
          Date.now(),
        ),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok.length).toBe(5); // stock suffisant : les 5 réservations aboutissent

    // Invariant argent : le solde ne descend jamais sous 0 et le crédit total consommé = 1000.
    const balance = await creditBalance(customer.id);
    expect(balance).toBe(0);

    const sql = getSql();
    const rows = (await sql`
      SELECT COALESCE(SUM(delta_minor), 0) AS redeemed FROM credits_ledger
      WHERE user_id = ${customer.id} AND reason = 'redeemed'
    `) as unknown as Array<{ redeemed: string | number }>;
    expect(Number(rows[0]!.redeemed)).toBe(-1000); // et NON -5000 (double-dépense évitée)
  });

  it('débite le grand livre exactement du crédit appliqué (pas de crédit réutilisable)', async () => {
    const customer = await createUser();
    const { storeId } = await createMerchantWithStore();
    const { bagInstanceId } = await createLiveBagInstance(storeId, {
      quantity: 1,
      priceMinor: 1000,
    });
    await grantCredit(customer.id, 5000);

    await createOrder(
      asCustomer(customer),
      { bagInstanceId, quantity: 1, paymentMethod: 'cash', useCreditMinor: 500 },
      Date.now(),
    );

    expect(await creditBalance(customer.id)).toBe(4500); // 5000 − 500 débité
  });
});

describe('Stock — garde atomique anti-oversell', () => {
  it('ne vend jamais au-delà du stock sous réservations concurrentes de clients différents', async () => {
    const { storeId } = await createMerchantWithStore();
    const { bagInstanceId } = await createLiveBagInstance(storeId, {
      quantity: 3,
      priceMinor: 1000,
    });
    // Clients DIFFÉRENTS : le verrou par-utilisateur ne sérialise pas → vraie concurrence sur le stock.
    const customers = await Promise.all(Array.from({ length: 6 }, () => createUser()));

    const results = await Promise.allSettled(
      customers.map((c) =>
        createOrder(
          asCustomer(c),
          { bagInstanceId, quantity: 1, paymentMethod: 'cash' },
          Date.now(),
        ),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    expect(ok).toBe(3); // exactement le stock
    expect(failed).toBe(3); // les autres reçoivent « épuisé »
    expect(await reservedQty(bagInstanceId)).toBe(3);
  });
});

describe('Payouts — flux cash vs en ligne (C2)', () => {
  it('facture la commission au commerçant sur une vente CASH (net négatif = dette)', async () => {
    const customer = await createUser();
    const { merchantId, storeId } = await createMerchantWithStore({ commissionBps: 1500 });
    const { bagInstanceId } = await createLiveBagInstance(storeId);
    await insertPickedUpOrder({
      userId: customer.id,
      storeId,
      bagInstanceId,
      paymentMethod: 'cash',
      totalMinor: 10000,
    });

    const today = new Date().toISOString().slice(0, 10);
    await generatePayoutDrafts(today, today);

    const sql = getSql();
    const rows = (await sql`
      SELECT gross_minor, commission_minor, net_minor FROM payouts WHERE merchant_id = ${merchantId}
    `) as unknown as Array<{ gross_minor: number; commission_minor: number; net_minor: number }>;
    expect(rows.length).toBe(1);
    // Cash : la plateforme a déjà été court-circuitée (le commerçant a encaissé), elle lui
    // FACTURE la commission → net = −commission (et non +net).
    expect(Number(rows[0]!.commission_minor)).toBe(1500); // 15 % de 10000
    expect(Number(rows[0]!.net_minor)).toBe(-1500);
  });

  it('reverse le net (brut − commission) sur une vente EN LIGNE', async () => {
    const customer = await createUser();
    const { merchantId, storeId } = await createMerchantWithStore({ commissionBps: 1500 });
    const { bagInstanceId } = await createLiveBagInstance(storeId);
    await insertPickedUpOrder({
      userId: customer.id,
      storeId,
      bagInstanceId,
      paymentMethod: 'konnect',
      totalMinor: 10000,
    });

    const today = new Date().toISOString().slice(0, 10);
    await generatePayoutDrafts(today, today);

    const sql = getSql();
    const rows = (await sql`
      SELECT net_minor FROM payouts WHERE merchant_id = ${merchantId}
    `) as unknown as Array<{ net_minor: number }>;
    expect(Number(rows[0]!.net_minor)).toBe(8500); // 10000 − 1500
  });
});

describe('Autorisation — suspension commerçant (H1)', () => {
  it('coupe la vente : boutiques en pause, rôle rétrogradé, réservation refusée', async () => {
    const admin = await createUser({ role: 'admin' });
    const buyer = await createUser();
    const { merchantId, storeId, ownerUserId } = await createMerchantWithStore({
      status: 'approved',
      storeStatus: 'active',
    });
    const { bagInstanceId } = await createLiveBagInstance(storeId, { quantity: 3 });

    await approveMerchant(admin.id, merchantId, { status: 'suspended' });

    const sql = getSql();
    const store = (await sql`SELECT status FROM stores WHERE id = ${storeId}`) as unknown as Array<{
      status: string;
    }>;
    expect(store[0]!.status).toBe('paused');
    const owner =
      (await sql`SELECT role FROM users WHERE id = ${ownerUserId}`) as unknown as Array<{
        role: string;
      }>;
    expect(owner[0]!.role).toBe('customer'); // rétrogradé

    // La réservation est refusée même si l'instance est restée 'live' (garde EXISTS merchant approuvé).
    await expect(
      createOrder(
        asCustomer(buyer),
        { bagInstanceId, quantity: 1, paymentMethod: 'cash' },
        Date.now(),
      ),
    ).rejects.toThrow();
    expect(await reservedQty(bagInstanceId)).toBe(0);
  });
});

describe('Autorisation — validation de retrait par code (C3)', () => {
  it("n'autorise que le commerçant propriétaire à valider le retrait", async () => {
    const customer = await createUser();
    const merchantA = await createMerchantWithStore();
    const merchantB = await createMerchantWithStore(); // commerçant tiers
    const { bagInstanceId } = await createLiveBagInstance(merchantA.storeId, { quantity: 1 });

    const { order } = await createOrder(
      asCustomer(customer),
      { bagInstanceId, quantity: 1, paymentMethod: 'cash' },
      Date.now(),
    );
    const code = order.pickupCode!;
    expect(code).toBeTruthy();

    // Un AUTRE commerçant ne peut pas valider (ni découvrir) le code d'une commande qui n'est
    // pas dans ses boutiques.
    await expect(validatePickupByCode(merchantB.ownerUserId, code, Date.now())).rejects.toThrow();

    // Le propriétaire, lui, valide : la commande passe à 'picked_up'.
    const res = await validatePickupByCode(merchantA.ownerUserId, code, Date.now());
    expect(res.status).toBe('picked_up');
  });
});
