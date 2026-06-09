import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "image_url";
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "image_id" integer;
    ALTER TABLE "articles" ADD CONSTRAINT "articles_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "articles_image_idx" ON "articles" USING btree ("image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP CONSTRAINT IF EXISTS "articles_image_id_media_id_fk";
    DROP INDEX IF EXISTS "articles_image_idx";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "image_id";
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "image_url" varchar;
  `)
}
