import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tags" ALTER COLUMN "seo_text" TYPE varchar USING COALESCE("seo_text"::text, NULL);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tags" ALTER COLUMN "seo_text" TYPE jsonb USING NULL;
  `)
}
