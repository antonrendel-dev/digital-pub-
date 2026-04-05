# Deployment & Operations

## Deployment Platform

**Platform:** VPS on NetAngels (netangels.ru)

**Type:** Linux VPS — Node.js process managed by PM2, proxied by Nginx

**Why:** Russian hosting provider, full server control, domain d-pub.ru hosted here

---

## Access Information

**SSH Access:**
- Production: TBD (configure after VPS provisioning)

**Credentials location:** GitHub Actions secrets (for CI/CD deploy)

---

## Environment Variables

See `.env.example` in project root.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session signing |
| `NEXTAUTH_URL` | Full site URL (https://d-pub.ru) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password |
| `TELEGRAM_CHANNELS` | Comma-separated Telegram channel usernames to sync (e.g. `web_vacancy,digital_pub`) |
| `SYNC_INTERVAL_MINUTES` | How often to run Telegram sync (default: 10) |

---

## Deployment Triggers

**Production:** Auto-deploy on push to `main` via GitHub Actions → SSH into VPS → `git pull` → `npx prisma migrate deploy` → `pm2 restart dpub`

**Dev:** No staging environment — test locally before merging to main.

---

## Server Setup (one-time)

On VPS:
1. Install Node.js 20+, PostgreSQL, Nginx, PM2
2. Clone repo, install deps: `npm install`
3. Configure `.env` with production values
4. Run `npx prisma migrate deploy` to init DB
5. Build: `npm run build`
6. Start with PM2: `pm2 start npm --name dpub -- start`
7. Configure Nginx as reverse proxy to `localhost:3000`
8. Point domain d-pub.ru to VPS IP, set up SSL with Certbot

---

## Pre-Deploy Checklist

- [ ] Run `npm run build` locally — no errors
- [ ] If schema changed: migration file exists in `prisma/migrations/`
- [ ] `.env` on server has all required vars from `.env.example`

---

## Rollback Procedure

**Code rollback:** SSH into VPS → `git checkout <prev-commit>` → `npm run build` → `pm2 restart dpub`

**DB rollback:** Manual — Prisma does not auto-rollback. Keep rollback SQL in `prisma/migrations/rollbacks/` for destructive changes.

**Approximate time:** ~5 minutes without DB changes, ~15 minutes with DB rollback.

---

## Environments

**Production:** https://d-pub.ru — deploys from `main` branch

No staging environment.

---

## Monitoring & Observability

### Logging

**Where:** PM2 logs — `pm2 logs dpub`
**Format:** Default Next.js stdout

### Error Tracking

**Tool:** Not configured initially.

### Health Checks

**Endpoint:** Not configured initially. Check `pm2 status` on server.
