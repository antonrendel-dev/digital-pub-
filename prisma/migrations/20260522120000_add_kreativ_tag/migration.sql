-- Add new specialization tag: Креатив
INSERT INTO "Tag" ("name", "slug", "tagType")
VALUES ('Креатив', 'kreativ', 'specialization')
ON CONFLICT ("slug") DO NOTHING;
