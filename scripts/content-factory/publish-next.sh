#!/bin/bash
# Запускается по cron пн/ср/пт в 09:00 МСК (06:00 UTC):
# 0 6 * * 1,3,5 /home/claude/projects/digital-pub-/scripts/content-factory/publish-next.sh

set -a
source /opt/bots/content-factory/.env
set +a

LOG="/home/claude/projects/digital-pub-/logs/content-factory.log"
mkdir -p "$(dirname "$LOG")"

echo "=== Content Factory run: $(date) ===" >> "$LOG"
node /home/claude/projects/digital-pub-/scripts/content-factory/scheduler.compiled.js >> "$LOG" 2>&1
echo "=== Done ===" >> "$LOG"
echo "" >> "$LOG"
