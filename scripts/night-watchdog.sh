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

# Возвращает 0 только если Телеграм подтвердил отправку. Раньше ответ не
# смотрели вовсе: один «<» или «&» в записи журнала — и Bot API отдавал 400
# «can't parse entities», а сторож считал, что отчитался, и молчал 45 минут.
say() {
  local resp
  resp=$(curl -s -m 15 -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "$(python3 -c "
import json,sys,os
print(json.dumps({'chat_id': os.environ['SEO_LAB_CHAT_ID'],
                  'message_thread_id': int(os.environ['SEO_LAB_TOPIC_ID']),
                  'text': sys.argv[1], 'parse_mode': 'HTML'}))" "$1")")
  if grep -q '"ok":true' <<<"$resp"; then return 0; fi
  echo "$(date '+%F %T') отправка не прошла: $(head -c 200 <<<"$resp")" >> "$LOG"
  return 1
}

last_alert=0
started=$(date +%s)
echo "$(date '+%F %T') сторож поднят, порог ${STALL_MIN} мин" >> "$LOG"

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  sleep 300
  # Полный отказ прогона выглядит как отсутствующий журнал: сессия не поднялась,
  # запуск упал, передан не тот путь. Раньше сторож в этом случае молчал до утра —
  # то есть не срабатывал именно там, где нужен больше всего.
  if [ ! -f "$JOURNAL" ]; then
    waited=$(( ( $(date +%s) - started ) / 60 ))
    if [ "$waited" -ge "$STALL_MIN" ] && [ $(( ( $(date +%s) - last_alert ) / 60 )) -ge "$REPEAT_MIN" ]; then
      if say "⏰ <b>Ночной прогон не начался</b>\nЖурнал ${JOURNAL} не создан за ${waited} мин."; then
        echo "$(date '+%F %T') тревога: журнал не появился за ${waited} мин" >> "$LOG"
        last_alert=$(date +%s)
      fi
    fi
    continue
  fi
  quiet=$(( ( $(date +%s) - $(stat -c %Y "$JOURNAL") ) / 60 ))
  now=$(date +%s)
  if [ "$quiet" -ge "$STALL_MIN" ] && [ $(( (now - last_alert) / 60 )) -ge "$REPEAT_MIN" ]; then
    tail=$(grep -v '^|' "$JOURNAL" | grep -v '^#' | grep -v '^$' | tail -1)
    if say "⏰ <b>Ночной прогон встал</b>\nЖурнал молчит ${quiet} мин.\nПоследняя запись: ${tail}"; then
      echo "$(date '+%F %T') тревога: молчание ${quiet} мин" >> "$LOG"
      last_alert=$now
    fi
  fi
done
echo "$(date '+%F %T') сторож снят по времени" >> "$LOG"
