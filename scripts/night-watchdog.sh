#!/bin/bash
# Сторож ночного прогона.
#
# Смотрит, шевелится ли журнал. Если он не менялся дольше порога — значит
# работа встала: сессия умерла, упёрлась в вопрос или зациклилась. Пишет
# Тони в тот же топик, куда отчитывается контент-завод.
#
# Живёт отдельным процессом намеренно: сторож, зависящий от того, за кем
# следит, бесполезен ровно в тот момент, когда нужен.
set -u

# Журнал передаётся аргументом: дата в пути менялась руками каждую ночь, и
# 02.09.2026 сторож сутки следил за журналом позапрошлого прогона.
JOURNAL="${1:-/home/claude/projects/digital-pub-/logs/night-$(date +%F).md}"
LOG="/home/claude/projects/digital-pub-/logs/night-watchdog.log"
STALL_MIN=40          # столько молчания считаем застоем
REPEAT_MIN=45         # не чаще этого напоминаем повторно
DEADLINE=$(date -d '09:00' +%s)   # утром прогон всё равно закончен
[ "$(date +%s)" -gt "$DEADLINE" ] && DEADLINE=$(date -d 'tomorrow 09:00' +%s)

set -a; source /opt/bots/content-factory/.env; set +a
TOKEN="${CONTENT_BOT_TOKEN:-$BOT_TOKEN}"

say() {
  curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "$(python3 -c "
import json,sys,os
print(json.dumps({'chat_id': os.environ['SEO_LAB_CHAT_ID'],
                  'message_thread_id': int(os.environ['SEO_LAB_TOPIC_ID']),
                  'text': sys.argv[1], 'parse_mode': 'HTML'}))" "$1")" >/dev/null
}

last_alert=0
echo "$(date '+%F %T') сторож поднят, порог ${STALL_MIN} мин" >> "$LOG"

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  sleep 300
  [ -f "$JOURNAL" ] || continue
  quiet=$(( ( $(date +%s) - $(stat -c %Y "$JOURNAL") ) / 60 ))
  now=$(date +%s)
  if [ "$quiet" -ge "$STALL_MIN" ] && [ $(( (now - last_alert) / 60 )) -ge "$REPEAT_MIN" ]; then
    tail=$(grep -v '^|' "$JOURNAL" | grep -v '^#' | grep -v '^$' | tail -1)
    say "⏰ <b>Ночной прогон встал</b>%0AЖурнал молчит ${quiet} мин.%0AПоследняя запись: ${tail}"
    echo "$(date '+%F %T') тревога: молчание ${quiet} мин" >> "$LOG"
    last_alert=$now
  fi
done
echo "$(date '+%F %T') сторож снят по времени" >> "$LOG"
