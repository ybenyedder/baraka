# syntax=docker/dockerfile:1
# Image API Baraka (+ worker + migrate). Contexte de build = racine du monorepo.
# Cible : linux/arm64 (Raspberry Pi). Construite via buildx en CI.

# ---- Base ----
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ---- Prune : sous-ensemble minimal du monorepo pour @baraka/api ----
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@^2 prune @baraka/api --docker

# ---- Install + build ----
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @baraka/api build
# node_modules de prod auto-suffisant
RUN pnpm --filter @baraka/api deploy --prod /prod/api

# ---- Runner ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV MIGRATIONS_DIR=/app/drizzle
# Utilisateur non-root
RUN groupadd -r baraka && useradd -r -g baraka baraka
COPY --from=builder /prod/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/db/drizzle ./drizzle
RUN mkdir -p /app/data/uploads && chown -R baraka:baraka /app
USER baraka
EXPOSE 3001
# Par défaut : migrations puis serveur. Le service worker surcharge la commande.
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/server.js"]
