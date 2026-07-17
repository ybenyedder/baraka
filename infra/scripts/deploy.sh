#!/usr/bin/env bash
# Déploiement sur le Pi : pull des nouvelles images + redémarrage + smoke-check.
# Appelé par la CI via SSH (sur le réseau Tailscale), ou manuellement sur le Pi.
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")/../compose" && pwd)"
cd "$COMPOSE_DIR"

echo "→ pull des images…"
docker compose pull api worker web

echo "→ redémarrage (migrations jouées à l'entrypoint de l'API)…"
docker compose up -d

echo "→ smoke-check /healthz…"
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:${API_LOCAL_PORT:-3001}/healthz" >/dev/null 2>&1; then
    echo "✓ API en bonne santé."
    exit 0
  fi
  sleep 2
done
echo "✗ /healthz n'a pas répondu à temps." >&2
docker compose logs --tail=50 api >&2
exit 1
