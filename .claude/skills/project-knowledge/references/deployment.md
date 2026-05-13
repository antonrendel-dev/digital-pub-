# Deployment & Operations

> Last updated: 2026-05-13 — миграция с Nuxt.cloud на NetAngels.

## Deployment Platform

**Platform:** NetAngels (shared hosting с поддержкой Node.js)

**App host:** `c48127@91.201.52.231` — приложение в `~/d-pub.ru/`
**Front proxy:** `root@144.31.204.181` — внешний прокси перед NetAngels
**Internal port:** `3001` (Next.js слушает на 3001, прокси терминирует SSL и кидает на него)

**Index status:** **Закрыт от поисковиков намеренно** через `X-Robots-Tag: noindex, nofollow` в `next.config.mjs`. Не снимать до явной команды Тони — проект ещё не готов для полноценного онлайна.

---

## Access Information

**App server (NetAngels):**
```
ssh c48127@91.201.52.231
```
Корень приложения: `~/d-pub.ru/`, исходники: `~/d-pub.ru/app/`

**Front proxy:**
```
ssh root@144.31.204.181
```

**Database:** PostgreSQL, строка подключения в переменной окружения `$DB_CONNECTION_STRING` на app-сервере (не `DATABASE_URL`, как было раньше).

---

## Environment Variables

| Variable | Description |
|---|---|
| `DB_CONNECTION_STRING` | PostgreSQL connection string (актуальное имя на NetAngels) |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session signing |
| `NEXTAUTH_URL` | Full site URL (https://d-pub.ru) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password |
| `TELEGRAM_CHANNELS` | Comma-separated Telegram channel usernames to sync |
| `SYNC_INTERVAL_MINUTES` | How often to run Telegram sync (default: 10) |

---

## Deployment Procedure (NetAngels)

Ручной деплой по SSH (CI/CD пока не настроен после переезда):

```bash
ssh c48127@91.201.52.231
cd ~/d-pub.ru/app/
git pull            # если правки уже в репо
export NODE_ENV=development && npm run build
cd ~/d-pub.ru/
touch reload        # сигнал NetAngels Passenger-подобному раннеру перезапустить процесс
```

`touch reload` — штатный механизм NetAngels для перезапуска Node-приложения без `pm2`/`systemd`.

---

## Pre-Deploy Checklist

- [ ] Локально `npm run build` — без ошибок
- [ ] Если менялась схема Prisma — миграция в `prisma/migrations/` есть, на сервере запустить `npx prisma migrate deploy`
- [ ] `.env` на сервере содержит `DB_CONNECTION_STRING` и остальные переменные
- [ ] `X-Robots-Tag` в `next.config.mjs` остаётся `noindex, nofollow` (намеренно)

---

## Rollback Procedure

```bash
ssh c48127@91.201.52.231
cd ~/d-pub.ru/app/
git checkout <prev-commit>
export NODE_ENV=development && npm run build
cd ~/d-pub.ru/ && touch reload
```

Откат БД — вручную, Prisma сама не откатывает. Деструктивные миграции сопровождать SQL-откатом в `prisma/migrations/rollbacks/`.

---

## Environments

**Production-like:** https://d-pub.ru — закрыт от индексации, деплой ручной с `main` или активной ветки.

Staging нет.

---

## Monitoring & Observability

**Логи:** через NetAngels-панель и/или файлы в `~/d-pub.ru/log/` (уточнить точный путь на сервере).
**Health-check:** ручной — `curl https://d-pub.ru` и проверка status code.
**Error tracking:** не настроен.

---

## Known Issues (open)

- **Telegram → сайт:** после переезда сломалась передача распарсенных вакансий из Telegram-бота на сайт. Нужна диагностика: где останавливается цепочка (бот шлёт? API принимает? БД пишется? фронт читает?).
- **Битые ссылки:** возможны после смены хостинга — нужно прогнать аудит кликабельности всех внутренних/внешних ссылок и API-эндпоинтов.
