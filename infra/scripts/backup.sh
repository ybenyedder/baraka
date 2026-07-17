#!/usr/bin/env bash
# Sauvegarde nocturne : pg_dump compressé + archive des uploads, chiffrés côté client
# avec age, puis envoyés vers Backblaze B2 (rclone). Rien ne part en clair.
# À planifier via cron : 0 3 * * * /opt/baraka/infra/scripts/backup.sh >> /var/log/baraka-backup.log 2>&1
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")/../compose" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/backups}"
RCLONE_REMOTE="${RCLONE_REMOTE:-b2:baraka-backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"

cd "$COMPOSE_DIR"
# shellcheck disable=SC1091
set -a; source .env; set +a

# Chiffrement obligatoire : clé publique age du destinataire (ex. age1xxxx…).
# La clé PRIVÉE correspondante doit être conservée HORS du Pi (voir provision-pi.sh),
# sinon une restauration est impossible.
if [ -z "${BACKUP_AGE_RECIPIENT:-}" ]; then
  echo "✗ BACKUP_AGE_RECIPIENT est absent : impossible de chiffrer les sauvegardes." >&2
  echo "  Renseignez la clé publique age (age1…) dans infra/compose/.env avant de relancer." >&2
  exit 1
fi

command -v age >/dev/null || { echo "✗ 'age' introuvable : installez-le (apt-get install age)." >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
DUMP="$BACKUP_DIR/baraka_${STAMP}.dump.zst.age"
UPLOADS="$BACKUP_DIR/uploads_${STAMP}.tar.zst.age"

echo "→ pg_dump + chiffrement age ($STAMP)…"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" \
  | zstd -q -c \
  | age -r "$BACKUP_AGE_RECIPIENT" > "$DUMP"

echo "→ archive uploads + chiffrement age…"
tar -C "$COMPOSE_DIR/data" -cf - uploads \
  | zstd -q -c \
  | age -r "$BACKUP_AGE_RECIPIENT" > "$UPLOADS"

echo "→ envoi vers $RCLONE_REMOTE…"
rclone copy "$DUMP" "$RCLONE_REMOTE/db/" --quiet
rclone copy "$UPLOADS" "$RCLONE_REMOTE/uploads/" --quiet

echo "→ rotation locale (7 jours)…"
find "$BACKUP_DIR" -name 'baraka_*.dump.zst.age' -mtime +7 -delete
find "$BACKUP_DIR" -name 'uploads_*.tar.zst.age' -mtime +7 -delete

# Ping de succès pour Uptime Kuma (silence = alerte).
[ -n "${KUMA_PUSH_URL:-}" ] && curl -fsS "$KUMA_PUSH_URL" >/dev/null || true
echo "✓ Sauvegarde chiffrée terminée : $DUMP + $UPLOADS"
