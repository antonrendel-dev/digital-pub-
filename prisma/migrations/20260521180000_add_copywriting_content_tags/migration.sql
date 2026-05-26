-- Add new specialization tags: Копирайтинг and Контент
INSERT INTO "Tag" ("name", "slug", "tagType")
VALUES
  ('Копирайтинг', 'copywriting', 'specialization'),
  ('Контент', 'content', 'specialization')
ON CONFLICT ("slug") DO NOTHING;
