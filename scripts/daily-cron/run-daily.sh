#!/bin/bash
# Ежедневный крон задач: утренний разбор доски. Нужное время — 09:30 МСК,
# через полчаса после контент-завода.
#
# Cron запускает нас КАЖДЫЙ час в :30, а нужный час скрипт выбирает сам:
#   30 * * * * /home/claude/projects/digital-pub-/scripts/daily-cron/run-daily.sh
#
# Почему не CRON_TZ. Проверено 25.08.2026: на этой машине CRON_TZ не работает —
# запись, поставленная на московские 10:12, не сработала в серверные 09:12, и
# первый прогон в 09:30 МСК не состоялся. При этом задачи выше строки CRON_TZ
# отрабатывали штатно, то есть сам cron жив.
#
# Почему не просто «сдвинуть на час». Сервер летом CEST (UTC+2), зимой CET
# (UTC+1), а Москва круглый год UTC+3. Разница меняется с одного часа на два,
# и фиксированное серверное время уехало бы при переводе часов.
set -euo pipefail

TARGET_HOUR=09
NOW_MSK_HOUR=$(TZ=Europe/Moscow date +%H)
if [ "$NOW_MSK_HOUR" != "$TARGET_HOUR" ] && [ "${FORCE_RUN:-}" != "1" ]; then
  exit 0
fi

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
