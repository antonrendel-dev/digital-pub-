#!/bin/bash
# Auto-sync: fetch new posts from Telegram, download full-quality photos, rebuild site
# Run via cron: */30 * * * * /home/claude/projects/digital-pub-/scripts/auto-sync.sh

set -e

PROJECT_DIR="/home/claude/projects/digital-pub-"
LOG_FILE="$PROJECT_DIR/logs/sync.log"
BOT_DATA="/opt/bots/telegram-bot-vac/data"
BOT_ENV="/opt/bots/telegram-bot-vac/.env"
BOT_IMAGE="ghcr.io/antonrendel-dev/telegram-bot-vac:latest"

# Ensure log directory exists
mkdir -p "$PROJECT_DIR/logs"

echo "=== Sync started: $(date) ===" >> "$LOG_FILE"

# Step 1: Sync posts from t.me/s/ (text) + download full-quality photos via Bot API
# The sync script uses forwardMessage trick to get 1200x628 photos from Telegram Bot API
# It also backfills any existing low-quality images automatically
cd "$PROJECT_DIR"
npx tsx scripts/sync-telegram.ts >> "$LOG_FILE" 2>&1

# Step 2 (optional fallback): Download photos via Telethon if Bot API missed any
# This requires the tech account Docker session and is kept as a safety net
if docker image inspect "$BOT_IMAGE" > /dev/null 2>&1; then
  docker run --rm \
    --env-file "$BOT_ENV" \
    -v "$BOT_DATA:/data" \
    -v "$PROJECT_DIR/public/images/posts:/output" \
    -v "$PROJECT_DIR/scripts/download-photos.py:/download-photos.py" \
    "$BOT_IMAGE" \
    python /download-photos.py web_vacancy 30 >> "$LOG_FILE" 2>&1 || true
fi

# Step 3: Rebuild and restart
npm run build >> "$LOG_FILE" 2>&1
pm2 restart digital-pub >> "$LOG_FILE" 2>&1

echo "=== Sync complete: $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
