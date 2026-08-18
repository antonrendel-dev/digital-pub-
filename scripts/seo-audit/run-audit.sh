#!/bin/bash
# SEO-аудит: сбор данных + отчёт в топик «SEO лаба».
# Cron (15 и 30 числа, 09:00 МСК — в феврале 28-го вместо 30-го):
#   CRON_TZ=Europe/Moscow
#   0 9 15 * * /home/claude/projects/digital-pub-/scripts/seo-audit/run-audit.sh
#   0 9 30 1,3,4,5,6,7,8,9,10,11,12 * /home/claude/projects/digital-pub-/scripts/seo-audit/run-audit.sh
#   0 9 28 2 * /home/claude/projects/digital-pub-/scripts/seo-audit/run-audit.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="/home/claude/projects/digital-pub-/logs/seo-audit.log"
mkdir -p "$(dirname "$LOG")"

# Одновременно может идти только один прогон: ручной запуск не должен
# столкнуться с cron и отправить два отчёта подряд.
exec 9>"$DIR/data/.lock"
if ! flock -n 9; then
  echo "$(date '+%F %T') Прогон уже идёт — выходим" >> "$LOG"
  exit 0
fi

set -a
source /opt/bots/content-factory/.env
set +a

{
  echo "=== SEO-аудит: $(date '+%F %T') ==="
  node "$DIR/collect.mjs"
  node "$DIR/report.mjs"
  echo "=== Готово ==="
  echo ""
} >> "$LOG" 2>&1
