# Deployment & Operations

> Last updated: 2026-08-19 — сверено с рабочими workflow и живым продом.

## Deployment Platform

**Platform:** NetAngels (shared hosting с поддержкой Node.js), Node 22

**App host:** `c48127@91.201.52.231` — приложение в `~/d-pub.ru/app/`
**Front proxy:** `root@144.31.204.181` (красный сервер) — внешний прокси перед NetAngels
**Restart:** `touch ~/d-pub.ru/reload` — штатный механизм NetAngels, без `pm2`/`systemd`

**Index status:** сайт **открыт для индексации**. `X-Robots-Tag: noindex` в `next.config.mjs` больше нет.
Правила отдаёт `app/robots.ts` (Next.js route → `/robots.txt`). Он же закрывает staging целиком,
если в окружении есть `PAYLOAD_PUSH_DB`.

**⚠️ Статические файлы в `public/` перекрывают роуты приложения.** Из-за этого забытый
`public/robots.txt` три месяца шэдоуил `app/robots.ts` на проде. Не класть в `public/` файлы,
имена которых совпадают с роутами.

---

## Access Information

**App server (NetAngels):** `ssh c48127@91.201.52.231`
Корень: `~/d-pub.ru/`, приложение: `~/d-pub.ru/app/`. Git-репозитория на сервере **нет** — код доставляется rsync'ом из CI.

**Front proxy:** `ssh root@144.31.204.181`

**Database:** PostgreSQL. Строка подключения дублируется в двух переменных — `DB_CONNECTION_STRING` и `DATABASE_URL` (обе пишет CI).

**ORM:** рантайм работает на **Payload CMS 3.x**, миграции — `payload-migrations/`.
Prisma осталась только в разовых скриптах `scripts/*.ts`, в `app/` и `lib/` не используется.

---

## Environment Variables

| Variable                        | Description                                        |
| ------------------------------- | -------------------------------------------------- |
| `DB_CONNECTION_STRING`          | PostgreSQL connection string                       |
| `DATABASE_URL`                  | То же значение, второе имя для совместимости       |
| `PAYLOAD_SECRET`                | Секрет Payload CMS                                 |
| `NEXT_PUBLIC_SERVER_URL`        | `https://d-pub.ru`                                 |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | ID счётчика Метрики                                |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-JM47D5L3GL`                                     |
| `PAYLOAD_PUSH_DB`               | Только на staging — включает blanket `Disallow: /` |

`NEXTAUTH_*`, `ADMIN_PASSWORD_HASH` и прочее из `.env.example` — наследие Prisma-эпохи, в проде не задаются.

На проде переменные лежат в двух местах: `~/d-pub.ru/app/.env` и пофайлово в `~/d-pub.ru/etc/environment/`. Оба пишет CI.

---

## Deployment Procedure

**Автоматический, ручной деплой не нужен.**

- push в `main` → `.github/workflows/deploy.yml` → продакшн (NetAngels)
- push в `dev` → `.github/workflows/deploy-staging.yml` → staging (красный сервер)

Что делает прод-пайплайн: `npm ci` → `npm run build` → компиляция `payload.config.ts` и
`payload-migrations/*.ts` через esbuild → rsync директорий → `npm ci --omit=dev` (только если
изменился `package-lock.json`) → `payload migrate` → `touch reload` → smoke-тест.

### rsync и `--delete` — что удаляется, а что нет

| Директория                           | `--delete` | Примечание                                       |
| ------------------------------------ | ---------- | ------------------------------------------------ |
| `.next/`                             | да         | `--exclude=cache/`                               |
| `public/`                            | да         | `--exclude=uploads/` + `--exclude=images/posts/` |
| `lib/`, `content/`, миграции, пакеты | нет        | удаления из репо на проде не применяются         |

**⚠️ Мина:** `public/images/posts/` на проде содержит ~1900 файлов, в git — около 340.
Остальные каждый час доливает `scripts/auto-sync.sh` с красного сервера. `public/uploads/` пишет Payload.
Обе директории обязаны оставаться в `--exclude` — снятие исключения сотрёт их при первом же деплое.

**Следствие отсутствия `--delete` на остальных путях:** удалённые из репо файлы остаются лежать на проде.
Не опасно для `lib/` (приложение работает из `.next/`) и для `content/` (slug-allowlist фиксируется на билде),
но при ревизии расхождений это первое место, куда смотреть.

---

## Pre-Deploy Checklist

- [ ] Локально `npm run build` — без ошибок
- [ ] Если менялась схема Payload — миграция в `payload-migrations/` закоммичена
- [ ] Если правился rsync в workflow — прогнать `--dry-run` на копии из `git archive HEAD public/` и убедиться, что список удаляемого ожидаемый

---

## Rollback Procedure

`git revert` проблемного коммита → push в `main` → пайплайн выкатит предыдущее состояние.

Откат БД — вручную из бэкапа NetAngels; Payload миграции сам не откатывает.

---

## Environments

**Production:** https://d-pub.ru — ветка `main`, NetAngels, рестарт через `touch reload`.

**Staging:** https://staging.d-pub.ru — ветка `dev`, красный сервер `144.31.204.181`.

- Приложение в `~/staging/d-pub/`, процесс `d-pub-staging` под **root'овым** pm2 (`sudo pm2 list`)
- Секреты: `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`, `STAGING_DB_CONNECTION_STRING`, `STAGING_PAYLOAD_SECRET`
- Закрыт от индексации через `PAYLOAD_PUSH_DB` в окружении

**Workflow:** feature-ветка → merge в `dev` → автодеплой на staging → тест → merge в `main` → продакшн.

---

## Monitoring & Observability

**Логи прода:** панель NetAngels и `~/d-pub.ru/log/`.
**Логи staging:** `/root/.pm2/logs/d-pub-staging-{out,error}.log`.
**Health-check:** ручной — `curl -o /dev/null -w '%{http_code}' https://d-pub.ru/`.
**Error tracking:** не настроен.

---

## Backups

Автоматические бэкапы на стороне NetAngels, 3 раза в день: файлы сайта + PostgreSQL целиком.
Восстановление — через панель управления NetAngels. Git-история — дополнительный бэкап кода, но не данных.

---

## Known Issues (open)

### 🔴 Staging лежит

`d-pub-staging` в статусе `errored`, 160 рестартов, `https://staging.d-pub.ru` отдаёт **502** (проверено 2026-08-19).
Оба pm2-лога пустые — падает до записи. Диагностировать запуском вручную из `~/staging/d-pub/`.

### 🟡 gitleaks

Не установлен в системе, pre-commit hook не отрабатывает.

---

## Resolved

- **P0 `useContext` crash при билде (13.05.2026)** — устранён, билд стабильно проходит в CI.
- **CI/CD не настроен после переезда** — настроен, оба workflow работают.
- **`robots.txt` шэдоуился статикой (27.05 – 19.08.2026)** — статический файл удалён с прода,
  в `deploy.yml` добавлен `--delete` для `public/`, чтобы удаления из репо доезжали.
- **Публично лежал `digital-pub-v1.tar.gz`** с исходниками — снесён тем же `--delete`, отдаёт 404.
