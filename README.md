# Baraka 🥖♻️

**Baraka** est une marketplace anti-gaspillage alimentaire : les commerçants (boulangeries, restaurants, épiceries, hôtels…) vendent leurs invendus du jour sous forme de **paniers surprise** à prix réduit, que les clients réservent et récupèrent via l'application.

> _Baraka_ (بركة) — « abondance / bénédiction ». On ne gaspille pas la baraka.

Équivalent fonctionnel de « Too Good To Go », avec sa propre identité de marque, conçu pour la **Tunisie** (fr / en / arabe tunisien, paiement Konnect en TND) et **auto-hébergé sur un Raspberry Pi**.

## Plateformes

- **Mobile** iOS + Android — un seul code Expo / React Native (`apps/mobile`)
- **Web** client + tableau de bord commerçant + panneau admin — Next.js (`apps/web`)
- **API** REST + OpenAPI — Fastify (`apps/api`)

## Stack

TypeScript partout · Fastify 5 + Zod · Next.js 15 · Expo Router · Drizzle ORM · PostgreSQL 16 + PostGIS · pg-boss (jobs, pas de Redis) · better-auth · MapLibre + OpenFreeMap · Expo Push · Docker Compose (ARM64) · Cloudflare Tunnel + Caddy.

## Structure du monorepo

```
apps/
  api/       API Fastify + worker de jobs (pg-boss)
  web/       Next.js (public SEO + merchant + admin)
  mobile/    Expo (client + mode commerçant)
packages/
  shared/    Money, enums, machine à états commandes, DTOs Zod  ← contrat du domaine
  db/        schéma Drizzle + migrations + seed                 ← source de vérité BDD
  i18n/      locales fr/en/ar (ICU) + helpers RTL
  api-client/ client typé généré depuis l'OpenAPI
  config/    tsconfig + eslint partagés
infra/
  compose/   docker-compose, Caddy, cloudflared, postgresql.conf
  scripts/   backup / restore / deploy / provision-pi
```

## Démarrage rapide (développement)

```bash
# 1. pnpm via corepack (aucune install globale)
corepack prepare pnpm@9.15.0 --activate

# 2. Dépendances
pnpm install

# 3. Variables d'env
cp .env.example .env   # ajuster si besoin

# 4. Base de données (PostGIS) via Docker
docker compose -f infra/compose/docker-compose.dev.yml up -d db

# 5. Migrations + seed
pnpm db:migrate && pnpm db:seed

# 6. Tout lancer (api + web)
pnpm dev
```

Mobile : `pnpm --filter @baraka/mobile start` (nécessite un **dev client** Expo, pas Expo Go — MapLibre + MMKV sont natifs).

## Vérifications

```bash
pnpm typecheck   # types sur tout le monorepo
pnpm test        # tests unitaires (Vitest)
pnpm lint        # eslint
pnpm build       # build de production
```

## Règle d'or : l'argent

Tous les montants sont des **entiers en unités mineures** avec une colonne `currency`. Le **TND a 3 décimales (millimes)** : 12,500 TND = `12500`. Jamais de flottants — voir `packages/shared/src/money.ts`.

## Déploiement

Backend + web tournent sur un **Raspberry Pi 4/5 (8 Go, ARM64)** derrière un **Cloudflare Tunnel** + **Caddy**. Voir `infra/`. Les apps mobiles sont buildées via **EAS** et publiées sur l'App Store / Play Store.

## Feuille de route

Voir les jalons M0→M5 dans le plan d'implémentation. État courant : **M0 — Fondations**.

## Licence

**Propriétaire — © 2026 Baya Ben Yedder. Tous droits réservés.** Code protégé :
aucune modification, copie ou distribution sans autorisation écrite (voir [LICENSE](./LICENSE)).
