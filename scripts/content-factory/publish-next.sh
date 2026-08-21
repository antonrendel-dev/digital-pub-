#!/bin/bash
# Запускается по cron каждый день в 09:00 МСК (08:00 CEST):
# 0 8 * * * /home/claude/projects/digital-pub-/scripts/content-factory/publish-next.sh

set -a
source /opt/bots/content-factory/.env
set +a

LOG="/home/claude/projects/digital-pub-/logs/content-factory.log"
mkdir -p "$(dirname "$LOG")"

echo "=== Content Factory run: $(date) ===" >> "$LOG"
node /home/claude/projects/digital-pub-/scripts/content-factory/scheduler.compiled.js >> "$LOG" 2>&1
echo "=== Done ===" >> "$LOG"
echo "" >> "$LOG"
