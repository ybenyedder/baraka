#!/usr/bin/env bash
set -e

PI_HOST="volt@100.107.129.74"
REMOTE_DIR="~/baraka"

echo "Syncing files to $PI_HOST..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'apps/web/.next' --exclude '.turbo' ./ "$PI_HOST:$REMOTE_DIR"

echo "Deploying on Serveur..."
ssh "$PI_HOST" << 'EOF'
  cd ~/baraka/infra/compose
  
  if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env created from .env.example. Please update secrets if needed."
  fi
  
  # Si vous souhaitez builder directement sur le Pi :
  docker compose --env-file .env up -d --build
EOF

echo "Déploiement terminé !"
