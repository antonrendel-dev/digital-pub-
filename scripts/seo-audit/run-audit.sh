#!/bin/bash
# SEO-аудит: сбор данных, отчёт в топик «SEO лаба» и сведение находок с доской.
# Нужное время — 15-е и 30-е числа (в феврале 28-е), 09:00 МСК.
#
# Cron запускает нас КАЖДЫЙ час, а день и час скрипт выбирает сам:
#   0 * * * * /home/claude/projects/digital-pub-/scripts/seo-audit/run-audit.sh
#
# Почему не CRON_TZ. Проверено 25.08.2026: на этой машине она не работает —
# запись, поставленная на московские 10:12, не сработала в серверные 09:12.
# Сервер летом CEST, зимой CET, Москва круглый год UTC+3, поэтому и простой
# сдвиг на час уехал бы при переводе часов.
set -euo pipefail

TARGET_HOUR=09
MSK_HOUR=$(TZ=Europe/Moscow date +%H)
MSK_DAY=$(TZ=Europe/Moscow date +%d)
MSK_MONTH=$(TZ=Europe/Moscow date +%m)

# В феврале 30-го не бывает, поэтому второй прогон месяца — 28-го.
SECOND_RUN_DAY=30
[ "$MSK_MONTH" = "02" ] && SECOND_RUN_DAY=28

if [ "${FORCE_RUN:-}" != "1" ]; then
  [ "$MSK_HOUR" = "$TARGET_HOUR" ] || exit 0
  case "$MSK_DAY" in
    15 | "$SECOND_RUN_DAY") ;;
    *) exit 0 ;;
  esac
fi

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

# Логика находок живёт в TypeScript ради тестов — пересобираем перед прогоном,
# чтобы правка в .ts не разъехалась с тем, что реально исполняется.
"$DIR/build.sh" >> "$LOG" 2>&1

{
  echo "=== SEO-аудит: $(date '+%F %T') ==="
  node "$DIR/collect.mjs"
  node "$DIR/report.mjs"
  # Предложение задач по расхождению с прошлым снапшотом. Падение этого шага
  # не должно съесть уже отправленный отчёт — он ценен сам по себе.
  node "$DIR/sync-tasks.mjs" || echo "!!! sync-tasks.mjs упал, отчёт при этом отправлен"
  echo "=== Готово ==="
  echo ""
} >> "$LOG" 2>&1
