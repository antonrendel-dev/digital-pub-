#!/bin/bash
# Auto-sync: fetch new posts from Telegram, save to DB, rsync images to NetAngels.
# Cron on red server: 0 * * * * /home/claude/projects/digital-pub-/scripts/auto-sync.sh

PROJECT_DIR="/home/claude/projects/digital-pub-"
LOG_FILE="$PROJECT_DIR/logs/sync.log"
TSX="$PROJECT_DIR/node_modules/.bin/tsx"
SSH_KEY="/home/claude/.ssh/github_actions_deploy"
# SSH-цель прода (user@host) — не в репозитории: он публичный (S15).
TARGET_FILE="/home/claude/.config/d-pub/prod-ssh-target"
PROD_TARGET="${DPUB_PROD_SSH_TARGET:-$(cat "$TARGET_FILE" 2>/dev/null)}"
if [ -z "$PROD_TARGET" ]; then
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "$(date) нет SSH-цели прода: положи user@host в $TARGET_FILE" | tee -a "$LOG_FILE" >&2
  exit 1
fi
NETANGELS_IMAGES="$PROD_TARGET:~/d-pub.ru/app/public/images/posts/"

mkdir -p "$(dirname "$LOG_FILE")"

echo "=== Sync started: $(date) ===" >> "$LOG_FILE"

cd "$PROJECT_DIR"

# Load PAYLOAD_API_KEY from .env if not set in environment
if [ -z "$PAYLOAD_API_KEY" ] && [ -f "$PROJECT_DIR/.env" ]; then
  export PAYLOAD_API_KEY=$(grep "^PAYLOAD_API_KEY=" "$PROJECT_DIR/.env" | cut -d'=' -f2-)
fi

/usr/bin/node "$TSX" scripts/sync-telegram.ts >> "$LOG_FILE" 2>&1

echo "=== Rsync images to NetAngels ===" >> "$LOG_FILE"
/usr/bin/rsync -az -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  "$PROJECT_DIR/public/images/posts/" \
  "$NETANGELS_IMAGES" >> "$LOG_FILE" 2>&1

echo "=== Clear Next.js image optimizer cache on NetAngels ===" >> "$LOG_FILE"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new \
  "$PROD_TARGET" \
  "rm -rf ~/d-pub.ru/app/.next/cache/images/ && mkdir -p ~/d-pub.ru/app/.next/cache/images/" >> "$LOG_FILE" 2>&1

echo "=== Done: $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
