# Patterns & Conventions

Coding conventions, development workflow, and project-specific practices.
For universal coding standards, see `~/.claude/skills/code-writing/references/universal-patterns.md`.

---

## Project-Specific Code Patterns

### Content Status Lifecycle

All user-submitted and Telegram-synced content follows this status flow:

`pending` → `published` | `rejected`

- All new posts start as `pending` regardless of source (telegram or user form)
- Admin sets status to `published` or `rejected` in the admin panel
- Only `published` posts appear in the public feed

### Telegram Sync Deduplication

Posts from Telegram are deduplicated by `(telegram_message_id, channel_username)`. Before inserting, always check this pair exists. If found — skip, do not update.

### Tag Filtering

Tags are stored in DB and linked to posts via a join table. Client-side filtering on the feed page works against pre-loaded published posts (no additional API calls on filter change).

---

## Git Workflow

### Branch Structure

- **`main`** — Production-ready code. Triggers deploy to VPS via GitHub Actions.
- **`dev`** — Active development. All work goes here first.
- **`feature/name`** — Optional, for large features. Created from `dev`, merged back via PR.

### Branch Decision Criteria

**Direct to `dev`:** Bug fixes, small UI changes, copy edits, config updates.

**Feature branch:** New sections, DB schema changes, new integrations, admin panel features.

### Testing Requirements

- **On merge to main:** Must pass build (`next build`) with no errors.
- No automated test suite configured initially — verify manually before merging to main.

### Security & Quality Gates

- **Pre-commit:** Gitleaks scans for secrets. `.env` is gitignored — never commit it.
- Admin routes (`/admin/*`) must always be protected by NextAuth session check.

---

## Business Rules

### Moderation

- No content is published without admin approval, regardless of source.
- Rejected posts are kept in DB with `status=rejected` for audit — not deleted.

### Telegram Sync Channels

Channels to sync are configured via env var `TELEGRAM_CHANNELS` (comma-separated usernames). Adding a new channel requires only updating the env var — no code changes.

### Articles

Articles are created and edited exclusively via the admin panel. They have their own slug for SEO-friendly URLs (`/articles/{slug}`).
