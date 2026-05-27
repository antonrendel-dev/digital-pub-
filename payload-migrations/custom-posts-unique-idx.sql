-- Custom partial unique index for posts collection.
-- Payload's `indexes` config does not support WHERE clauses, so this must be
-- applied manually after `npx payload migrate` creates the posts table.
--
-- Run once per environment:
--   psql "$DB_CONNECTION_STRING" < payload-migrations/custom-posts-unique-idx.sql
--
-- This index enforces deduplication of Telegram posts:
-- two posts with the same (telegram_message_id, channel_username) are rejected,
-- but posts where either field IS NULL are always allowed (for user-created posts
-- and duplicated posts that intentionally have null telegramMessageId).

CREATE UNIQUE INDEX IF NOT EXISTS posts_telegram_dedup_idx
  ON posts (telegram_message_id, channel_username)
  WHERE telegram_message_id IS NOT NULL AND channel_username IS NOT NULL;
