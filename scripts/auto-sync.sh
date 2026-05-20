#!/bin/bash
# Auto-sync: fetch new posts from Telegram and save to DB.
# ISR (revalidate=300) handles cache refresh — no build or restart needed.
# Run via cron: */30 * * * * /home/c48127/d-pub.ru/app/scripts/auto-sync.sh

set -e

export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 22 --silent

PROJECT_DIR="/home/c48127/d-pub.ru/app"
LOG_FILE="/home/c48127/d-pub.ru/log/sync.log"
TSX="$PROJECT_DIR/node_modules/.bin/tsx"

mkdir -p "$(dirname "$LOG_FILE")"

echo "=== Sync started: $(date) ===" >> "$LOG_FILE"

cd "$PROJECT_DIR"
"$TSX" scripts/sync-telegram.ts >> "$LOG_FILE" 2>&1

echo "=== Sync complete: $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
