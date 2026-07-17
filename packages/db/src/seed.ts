/**
 * Seed de développement « démo complète » : catégories, réglages, comptes de
 * connexion (admin / commerçant / client), et un jeu réaliste de boutiques
 * géolocalisées à Tunis avec des paniers surprise LIVE (visibles dans la
 * recherche). Idempotent : les données transactionnelles sont réinitialisées à
 * chaque exécution, les utilisateurs sont conservés (upsert par e-mail).
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { createDb } from './client';
import { STORE_CATEGORIES } from '@baraka/shared';
import { storeCategories, appSettings } from './schema/index';

const DEFAULT_SETTINGS: Record<string, unknown> = {
  co2e_per_bag_g: 2700,
  cancellation_window_min: 120,
  payment_hold_min: 10,
  default_commission_bps: 1500,
  min_supported_app_version: '1.0.0',
};

/** Hache un mot de passe au format attendu par l'API (scrypt : saltHex:hashHex). */
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

const DEMO_PASSWORD = 'baraka123';

/** Comptes de connexion de démonstration. */
const USERS = [
  { email: 'admin@baraka.tn', name: 'Admin Baraka', role: 'admin', ref: 'ADMIN1' },
  { email: 'commercant@baraka.tn', name: 'Slah Commerçant', role: 'merchant', ref: 'MERCH1' },
  { email: 'client@baraka.tn', name: 'Amine Client', role: 'customer', ref: 'CLIENT1' },
] as const;

type Template = {
  name: string;
  description: string;
  bagCategory: 'meal' | 'bakery' | 'grocery' | 'other';
  dietary: string[];
  price: number; // millimes
  orig: number; // millimes
  total: number;
  reserved: number;
  sold: number;
};

type Store = {
  legalName: string;
  contactEmail: string;
  slug: string;
  name: string;
  description: string;
  category: (typeof STORE_CATEGORIES)[number];
  address: string;
  city: string;
  gov: string;
  lat: number;
  lng: number;
  rating: number; // ×100
  ratingCount: number;
  templates: Template[];
};

const bakery = (): Template => ({
  name: 'Panier Boulangerie',
  description: 'Pains, baguettes et viennoiseries de la journée.',
  bagCategory: 'bakery',
  dietary: ['vegetarian'],
  price: 4500,
  orig: 15000,
  total: 10,
  reserved: 2,
  sold: 3,
});
const pastries = (): Template => ({
  name: 'Panier Pâtisseries',
  description: 'Assortiment de douceurs tunisiennes et françaises.',
  bagCategory: 'bakery',
  dietary: ['vegetarian'],
  price: 6000,
  orig: 20000,
  total: 8,
  reserved: 1,
  sold: 2,
});
const meal = (): Template => ({
  name: 'Panier Repas Surprise',
  description: 'Plats du jour préparés, sauvés du gaspillage.',
  bagCategory: 'meal',
  dietary: ['halal'],
  price: 7900,
  orig: 24000,
  total: 12,
  reserved: 3,
  sold: 4,
});
const groceryBag = (): Template => ({
  name: 'Panier Fruits & Légumes',
  description: 'Produits frais du jour à sauver.',
  bagCategory: 'grocery',
  dietary: ['vegan'],
  price: 5900,
  orig: 18000,
  total: 9,
  reserved: 1,
  sold: 1,
});
const cafeBag = (): Template => ({
  name: 'Panier Douceurs Café',
  description: 'Boissons, cookies et petites douceurs.',
  bagCategory: 'other',
  dietary: ['vegetarian'],
  price: 5000,
  orig: 14000,
  total: 7,
  reserved: 0,
  sold: 2,
});
const buffet = (): Template => ({
  name: 'Panier Buffet',
  description: 'Généreux assortiment du buffet de fin de service.',
  bagCategory: 'meal',
  dietary: ['halal'],
  price: 9900,
  orig: 32000,
  total: 15,
  reserved: 4,
  sold: 5,
});

const STORES: Store[] = [
  {
    legalName: 'Boulangerie El Baraka',
    contactEmail: 'commercant@baraka.tn',
    slug: 'boulangerie-el-baraka-tunis',
    name: 'Boulangerie El Baraka',
    description: 'Pains, viennoiseries et pâtisseries du jour à sauver, en plein centre.',
    category: 'bakery_pastry',
    address: 'Avenue Habib Bourguiba',
    city: 'Tunis',
    gov: 'Tunis',
    lat: 36.8008,
    lng: 10.1815,
    rating: 480,
    ratingCount: 214,
    templates: [bakery(), pastries()],
  },
  {
    legalName: 'Chez Slah Traiteur',
    contactEmail: 'slah@demo.tn',
    slug: 'chez-slah-traiteur-lafayette',
    name: 'Chez Slah Traiteur',
    description: 'Plats tunisiens maison préparés chaque jour.',
    category: 'meals',
    address: 'Rue de Marseille, Lafayette',
    city: 'Tunis',
    gov: 'Tunis',
    lat: 36.8155,
    lng: 10.1817,
    rating: 460,
    ratingCount: 132,
    templates: [meal()],
  },
  {
    legalName: 'Café Journal',
    contactEmail: 'journal@demo.tn',
    slug: 'cafe-journal-lac',
    name: 'Café Journal',
    description: 'Café de quartier, viennoiseries et boissons.',
    category: 'cafe',
    address: 'Rue du Lac Turkana, Les Berges du Lac',
    city: 'Tunis',
    gov: 'Tunis',
    lat: 36.8425,
    lng: 10.276,
    rating: 440,
    ratingCount: 88,
    templates: [cafeBag()],
  },
  {
    legalName: 'Monoprix La Marsa',
    contactEmail: 'marsa@demo.tn',
    slug: 'monoprix-la-marsa',
    name: 'Monoprix La Marsa',
    description: 'Fruits, légumes et produits frais à sauver en fin de journée.',
    category: 'groceries',
    address: 'Avenue Habib Bourguiba, La Marsa',
    city: 'La Marsa',
    gov: 'Tunis',
    lat: 36.8783,
    lng: 10.3247,
    rating: 420,
    ratingCount: 176,
    templates: [groceryBag()],
  },
  {
    legalName: 'Pâtisserie Masmoudi',
    contactEmail: 'masmoudi@demo.tn',
    slug: 'patisserie-masmoudi-menzah',
    name: 'Pâtisserie Masmoudi',
    description: 'Baklawa, makroudh et gâteaux fins.',
    category: 'bakery_pastry',
    address: 'Avenue Hédi Nouira, El Menzah',
    city: 'Tunis',
    gov: 'Tunis',
    lat: 36.838,
    lng: 10.173,
    rating: 490,
    ratingCount: 301,
    templates: [pastries()],
  },
  {
    legalName: 'Hôtel Africa',
    contactEmail: 'africa@demo.tn',
    slug: 'hotel-africa-buffet-tunis',
    name: 'Hôtel Africa — Buffet',
    description: 'Le buffet du soir sauvé du gaspillage.',
    category: 'hotel_buffet',
    address: '50 Avenue Habib Bourguiba',
    city: 'Tunis',
    gov: 'Tunis',
    lat: 36.8,
    lng: 10.183,
    rating: 450,
    ratingCount: 64,
    templates: [buffet()],
  },
  {
    legalName: 'Le Bec Fin',
    contactEmail: 'becfin@demo.tn',
    slug: 'le-bec-fin-ariana',
    name: 'Le Bec Fin',
    description: 'Restaurant familial, cuisine du marché.',
    category: 'meals',
    address: 'Avenue de l’Indépendance, Ariana',
    city: 'Ariana',
    gov: 'Ariana',
    lat: 36.8625,
    lng: 10.195,
    rating: 470,
    ratingCount: 119,
    templates: [meal()],
  },
  {
    legalName: 'Boulangerie Ben Yedder',
    contactEmail: 'benyedder@demo.tn',
    slug: 'boulangerie-ben-yedder-bardo',
    name: 'Boulangerie Ben Yedder',
    description: 'Le pain chaud du quartier du Bardo.',
    category: 'bakery_pastry',
    address: 'Avenue Habib Bourguiba, Le Bardo',
    city: 'Le Bardo',
    gov: 'Tunis',
    lat: 36.809,
    lng: 10.134,
    rating: 465,
    ratingCount: 142,
    templates: [bakery()],
  },
  {
    legalName: 'Fruiterie du Coin',
    contactEmail: 'fruiterie@demo.tn',
    slug: 'fruiterie-du-coin-manar',
    name: 'Fruiterie du Coin',
    description: 'Fruits et légumes frais, invendus à petit prix.',
    category: 'groceries',
    address: 'Avenue Taïeb Mhiri, El Manar',
    city: 'Tunis',
    gov: 'Tunis',
    lat: 36.846,
    lng: 10.162,
    rating: 430,
    ratingCount: 57,
    templates: [groceryBag()],
  },
  {
    legalName: 'Café Sicca',
    contactEmail: 'sicca@demo.tn',
    slug: 'cafe-sicca-marsa-plage',
    name: 'Café Sicca',
    description: 'Terrasse en bord de mer, cafés et pâtisseries.',
    category: 'cafe',
    address: 'Corniche, La Marsa Plage',
    city: 'La Marsa',
    gov: 'Tunis',
    lat: 36.879,
    lng: 10.323,
    rating: 455,
    ratingCount: 93,
    templates: [cafeBag()],
  },
  {
    legalName: 'Dar Zarrouk',
    contactEmail: 'darzarrouk@demo.tn',
    slug: 'restaurant-dar-zarrouk-sidi-bou',
    name: 'Restaurant Dar Zarrouk',
    description: 'Cuisine méditerranéenne à Sidi Bou Saïd.',
    category: 'meals',
    address: 'Rue Hédi Zarrouk, Sidi Bou Saïd',
    city: 'Sidi Bou Saïd',
    gov: 'Tunis',
    lat: 36.871,
    lng: 10.347,
    rating: 485,
    ratingCount: 208,
    templates: [meal()],
  },
  {
    legalName: 'Croissanterie La Goulette',
    contactEmail: 'goulette@demo.tn',
    slug: 'croissanterie-la-goulette',
    name: 'Croissanterie La Goulette',
    description: 'Viennoiseries fraîches près du port.',
    category: 'bakery_pastry',
    address: 'Avenue Franklin Roosevelt, La Goulette',
    city: 'La Goulette',
    gov: 'Tunis',
    lat: 36.818,
    lng: 10.305,
    rating: 460,
    ratingCount: 76,
    templates: [bakery()],
  },
];

async function main() {
  const { db, client } = createDb();
  try {
    // Garde 1 (défense en profondeur) : blocage explicite en production.
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
      throw new Error(
        'Seed refusé en production (données de démo destructives). Définissez ALLOW_PROD_SEED=true pour forcer.',
      );
    }
    // Garde 2 (LA vraie protection, indépendante de NODE_ENV qui n'est pas fiable ici car
    // `tsx src/seed.ts` ne le positionne pas) : ne JAMAIS écraser une base contenant des données
    // transactionnelles — le TRUNCATE ... CASCADE effacerait sinon commandes, paiements, crédits,
    // payouts. Ferme le trou « fail-open » quel que soit l'environnement (H6).
    const forceReset = process.env.ALLOW_DESTRUCTIVE_SEED === 'true';
    const guardRows = (await client`
      SELECT
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM payments) AS payments,
        (SELECT COUNT(*) FROM credits_ledger) AS credits
    `) as unknown as Array<{ orders: string; payments: string; credits: string }>;
    const guard = guardRows[0]!;
    if (
      !forceReset &&
      (Number(guard.orders) > 0 || Number(guard.payments) > 0 || Number(guard.credits) > 0)
    ) {
      throw new Error(
        `Seed refusé : données transactionnelles présentes (commandes=${guard.orders}, paiements=${guard.payments}, crédits=${guard.credits}). ` +
          `Le seed de démo n'écrase jamais une base réelle — pour un reset volontaire, relancez avec ALLOW_DESTRUCTIVE_SEED=true.`,
      );
    }
    console.log('→ Seed des catégories de boutique…');
    await db
      .insert(storeCategories)
      .values(STORE_CATEGORIES.map((key, i) => ({ key, sort: i })))
      .onConflictDoNothing();

    console.log('→ Seed des réglages applicatifs…');
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await db.insert(appSettings).values({ key, value }).onConflictDoNothing();
    }

    console.log('→ Comptes de connexion de démo…');
    const pwHash = hashPassword(DEMO_PASSWORD);
    for (const u of USERS) {
      const rows = await client`
        INSERT INTO users (name, email, email_verified, role, locale, referral_code)
        VALUES (${u.name}, ${u.email}, true, ${u.role}, 'fr', ${u.ref})
        ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
        RETURNING id
      `;
      const userId = rows[0]!.id as string;
      await client`
        INSERT INTO accounts (user_id, account_id, provider_id, password)
        VALUES (${userId}, ${u.email}, 'credential', ${pwHash})
        ON CONFLICT (provider_id, account_id) DO NOTHING
      `;
      await client`
        INSERT INTO notification_prefs (user_id) VALUES (${userId})
        ON CONFLICT (user_id) DO NOTHING
      `;
    }
    const merchantUser = await client`SELECT id FROM users WHERE email = 'commercant@baraka.tn'`;
    const merchantUserId = merchantUser[0]!.id as string;

    // Base vérifiée sans transactions (garde 2) : le CASCADE ne peut plus effacer d'historique
    // financier — il ne touche que le catalogue de démo et ses dépendances vides.
    console.log('→ Réinitialisation des données de démo (boutiques, paniers)…');
    await client`
      TRUNCATE merchants, merchant_members, stores, bag_templates, bag_schedules, bag_instances
      RESTART IDENTITY CASCADE
    `;

    // Fenêtre de retrait du jour (l'heure exacte n'affecte pas la visibilité).
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth();
    const d = now.getDate();
    const dateStr = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const pickupStart = new Date(Date.UTC(y, mo, d, 16, 0, 0)).toISOString();
    const pickupEnd = new Date(Date.UTC(y, mo, d, 19, 30, 0)).toISOString();

    console.log(`→ Seed de ${STORES.length} boutiques + paniers live…`);
    let bagCount = 0;
    for (const s of STORES) {
      const mRows = await client`
        INSERT INTO merchants (legal_name, contact_email, status, commission_bps)
        VALUES (${s.legalName}, ${s.contactEmail}, 'approved', 1500)
        RETURNING id
      `;
      const merchantId = mRows[0]!.id as string;

      // Le commerçant de démo possède sa boutique.
      if (s.contactEmail === 'commercant@baraka.tn') {
        await client`
          INSERT INTO merchant_members (merchant_id, user_id, role)
          VALUES (${merchantId}, ${merchantUserId}, 'owner')
          ON CONFLICT DO NOTHING
        `;
      }

      const sRows = await client`
        INSERT INTO stores (merchant_id, slug, name, description, category_id,
                            address_line, city, governorate, country, location,
                            rating_avg, rating_count, status)
        SELECT ${merchantId}, ${s.slug}, ${s.name}, ${s.description}, cat.id,
              ${s.address}, ${s.city}, ${s.gov}, 'TN',
              ST_SetSRID(ST_MakePoint(${s.lng}, ${s.lat}), 4326)::geography,
              ${s.rating}, ${s.ratingCount}, 'active'
        FROM (SELECT id FROM store_categories WHERE key = ${s.category} LIMIT 1) cat
        RETURNING id
      `;
      const storeId = sRows[0]!.id as string;

      for (const t of s.templates) {
        const tRows = await client`
          INSERT INTO bag_templates (store_id, name, description, bag_category, dietary,
                                    price_minor, original_value_minor, currency, active)
          VALUES (${storeId}, ${t.name}, ${t.description}, ${t.bagCategory},
                  ${JSON.stringify(t.dietary)}::jsonb, ${t.price}, ${t.orig}, 'TND', true)
          RETURNING id
        `;
        const templateId = tRows[0]!.id as string;

        // Une instance live par template pour aujourd'hui (contrainte unique template+date).
        await client`
          INSERT INTO bag_instances (bag_template_id, store_id, date, pickup_start_at, pickup_end_at,
                                    quantity_total, quantity_reserved, quantity_sold,
                                    price_minor, original_value_minor, currency, status)
          VALUES (${templateId}, ${storeId}, ${dateStr}, ${pickupStart}, ${pickupEnd},
                  ${t.total}, ${t.reserved}, ${t.sold}, ${t.price}, ${t.orig}, 'TND', 'live')
        `;
        bagCount++;
      }
    }

    console.log(
      `✓ Seed terminé : ${USERS.length} comptes, ${STORES.length} boutiques, ${bagCount} paniers live.`,
    );
    console.log(`  Connexion démo → e-mails ci-dessus, mot de passe : ${DEMO_PASSWORD}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('✗ Échec du seed :', err);
  process.exit(1);
});
