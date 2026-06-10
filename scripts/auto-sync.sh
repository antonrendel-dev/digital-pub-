#!/bin/bash
# Auto-sync: fetch new posts from Telegram, save to DB, rsync images to NetAngels.
# Cron on red server: 0 * * * * /home/claude/projects/digital-pub-/scripts/auto-sync.sh

PROJECT_DIR="/home/claude/projects/digital-pub-"
LOG_FILE="$PROJECT_DIR/logs/sync.log"
TSX="$PROJECT_DIR/node_modules/.bin/tsx"
SSH_KEY="/home/claude/.ssh/github_actions_deploy"
NETANGELS_IMAGES="c48127@91.201.52.231:~/d-pub.ru/app/public/images/posts/"

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

echo "=== Done: $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
