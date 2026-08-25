# Юниты systemd

Лежат в git, чтобы их можно было восстановить — на самой машине они живут в
`~/.config/systemd/user/` и никакой историей не покрыты.

## content-bot.service

Бот контент-завода: принимает `/content_plan`, `/content_approve`,
`/content_write`, `/content_next`, `/content_regen` в топике «SEO лаба».

Раньше запускался руками в tmux и после перезапуска не поднимался. 25.08.2026
обнаружен полностью остановленным: ни одного процесса в системе, команды
одобрения тем не работали, и это осталось бы незамеченным до момента, когда
аналитик соберёт новый батч.

Юнит **пользовательский**, а не системный: sudo без пароля на машине нет.
Работает это потому, что для пользователя включён `linger` — сервис стартует
при загрузке и переживает выход из сессии.

### Установка

    mkdir -p ~/.config/systemd/user
    cp deploy/systemd/content-bot.service ~/.config/systemd/user/
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
    export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
    systemctl --user daemon-reload
    systemctl --user enable --now content-bot.service

### Управление

Обе переменные окружения выше нужны в каждой сессии: без них `systemctl --user`
не находит шину и отвечает «Failed to connect to bus».

    systemctl --user status content-bot
    systemctl --user restart content-bot
    tail -f logs/content-bot.log

Пересобрали бота через `scripts/content-factory/build.sh` — нужен `restart`,
иначе продолжит работать старая сборка.
