# syntax=docker/dockerfile:1
# Image web Baraka (Next.js standalone). Contexte de build = racine du monorepo.
# Cible : linux/arm64 (Raspberry Pi).

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@^2 prune @baraka/web --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @baraka/web build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN groupadd -r baraka && useradd -r -g baraka baraka
# Sortie standalone : server.js + node_modules tracés.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
USER baraka
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
