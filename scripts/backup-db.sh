#!/usr/bin/env bash
# digital_pub PostgreSQL backup script
#
# Cron: 30 3 * * * /home/claude/projects/digital-pub-/scripts/backup-db.sh >> /home/claude/backups/digital-pub/backup.log 2>&1
#
# Env vars:
#   DATABASE_URL  — connection string (default: from staging .env)
#   BACKUP_DIR    — where to store backups (default: /home/claude/backups/digital-pub)
#   BACKUP_RETAIN — days to keep (default: 7)

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/claude/backups/digital-pub}"
BACKUP_RETAIN="${BACKUP_RETAIN:-7}"
TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

if [ -z "${DATABASE_URL:-}" ]; then
  for env_file in /home/claude/staging/d-pub/.env /home/claude/d-pub.ru/.env; do
    if [ -f "$env_file" ]; then
      DATABASE_URL="$(grep -E '^DATABASE_URL=' "$env_file" | head -1 | cut -d= -f2-)"
      [ -n "$DATABASE_URL" ] && break
    fi
  done
fi

[ -z "${DATABASE_URL:-}" ] && die "DATABASE_URL not set and not found in .env files"

mkdir -p "$BACKUP_DIR" || die "Cannot create backup directory: $BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/digital_pub_${TIMESTAMP}.sql.gz"
TMP_FILE="$BACKUP_FILE.tmp"
trap 'rm -f "$TMP_FILE"' EXIT

log "Starting backup: digital_pub"

pg_dump "$DATABASE_URL" --no-owner --no-privileges --format=plain | gzip > "$TMP_FILE"

BACKUP_SIZE="$(stat -c%s "$TMP_FILE")"
if [ "$BACKUP_SIZE" -lt 1000 ]; then
  die "Backup file is suspiciously small (${BACKUP_SIZE} bytes), removed"
fi

mv "$TMP_FILE" "$BACKUP_FILE"
log "Backup created: $BACKUP_FILE ($(numfmt --to=iec "$BACKUP_SIZE"))"

DELETED=0
while IFS= read -r -d '' old_file; do
  rm -f "$old_file"
  DELETED=$((DELETED + 1))
done < <(find "$BACKUP_DIR" -name "digital_pub_*.sql.gz" -type f -mtime +"$BACKUP_RETAIN" -print0)

log "Rotation: deleted $DELETED backup(s) older than $BACKUP_RETAIN days"
log "Done"
