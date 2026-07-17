#!/usr/bin/env bash
# Restauration d'une sauvegarde pg_dump (.dump.zst) dans la base.
# Usage : ./restore.sh backups/baraka_20260704_030000.dump.zst
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage : $0 <fichier.dump.zst>" >&2
  exit 1
fi
DUMP="$1"
COMPOSE_DIR="$(cd "$(dirname "$0")/../compose" && pwd)"
cd "$COMPOSE_DIR"
# shellcheck disable=SC1091
set -a; source .env; set +a

echo "⚠️  Restauration de $DUMP dans la base '$POSTGRES_DB'. Ctrl-C pour annuler (5 s)…"
sleep 5

zstd -dc "$DUMP" | docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner
echo "✓ Restauration terminée."
