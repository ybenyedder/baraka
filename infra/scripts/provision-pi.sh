#!/usr/bin/env bash
# Provisionnement initial d'un Raspberry Pi (Debian/Ubuntu ARM64) pour Baraka.
# À lancer une fois, en root, après un boot sur SSD (jamais sur carte SD).
set -euo pipefail

echo "=== Baraka — provisionnement du Raspberry Pi ==="

# 1) Docker + compose plugin
if ! command -v docker >/dev/null; then
  echo "→ Installation de Docker…"
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "${SUDO_USER:-$USER}"
fi

# 2) Tailscale (administration privée : SSH, Kuma, psql)
if ! command -v tailscale >/dev/null; then
  echo "→ Installation de Tailscale…"
  curl -fsSL https://tailscale.com/install.sh | sh
  echo "   Lancez ensuite : sudo tailscale up"
fi

# 3) Outils de sauvegarde (age = chiffrement client des backups)
apt-get update -qq
apt-get install -y -qq zstd rclone git age

# 3b) Paire de clés age pour chiffrer les sauvegardes
echo "→ Chiffrement des sauvegardes (age) :"
echo "   Générez une paire de clés SUR UN POSTE DE CONFIANCE (pas sur le Pi) :"
echo "     age-keygen -o baraka-backup.key    # affiche la clé publique 'age1…'"
echo "   • Copiez la clé PRIVÉE (baraka-backup.key) hors du Pi, en lieu sûr :"
echo "     sans elle, aucune restauration n'est possible."
echo "   • Collez la clé PUBLIQUE dans BACKUP_AGE_RECIPIENT du fichier .env."

# 4) Arborescence
INSTALL_DIR="/opt/baraka"
mkdir -p "$INSTALL_DIR"
echo "→ Cloner le dépôt dans $INSTALL_DIR puis :"
echo "   cd $INSTALL_DIR/infra/compose && cp .env.example .env && \$EDITOR .env"
echo "   rclone config   # configurer le remote B2"
echo "   docker compose up -d"

# 5) Cron de sauvegarde
CRON_LINE="0 3 * * * $INSTALL_DIR/infra/scripts/backup.sh >> /var/log/baraka-backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v baraka-backup ; echo "$CRON_LINE" ) | crontab -
echo "✓ Cron de sauvegarde installé (3 h du matin)."

echo "=== Rappels ==="
echo "  - Onduleur (UPS) obligatoire : coupures de courant = risque de corruption."
echo "  - Créer le tunnel Cloudflare et coller le token dans .env."
echo "  - Ne jamais exposer la base ni Kuma au tunnel public."
