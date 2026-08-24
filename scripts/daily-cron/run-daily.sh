#!/bin/bash
# Ежедневный крон задач: утренний разбор доски.
# Cron (09:30 МСК, после контент-завода — тот стартует в 09:00):
#   CRON_TZ=Europe/Moscow
#   30 9 * * * /home/claude/projects/digital-pub-/scripts/daily-cron/run-daily.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="/home/claude/projects/digital-pub-/logs/daily-cron.log"
mkdir -p "$(dirname "$LOG")" "$DIR/data"

# Одновременно только один прогон: ручной запуск не должен столкнуться с cron
# и отправить два утренних сообщения подряд.
exec 9>"$DIR/data/.lock"
if ! flock -n 9; then
  echo "$(date '+%F %T') Прогон уже идёт — выходим" >> "$LOG"
  exit 0
fi

set -a
source /opt/bots/content-factory/.env
set +a

# Логика выбора живёт в TypeScript ради тестов — пересобираем перед прогоном,
# чтобы правка в .ts не разъехалась с тем, что реально исполняется.
"$DIR/build.sh" >> "$LOG" 2>&1

{
  echo "=== Ежедневный крон: $(date '+%F %T') ==="
  node "$DIR/run.mjs"
  echo "=== Готово ==="
  echo ""
} >> "$LOG" 2>&1
