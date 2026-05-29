import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ALTER COLUMN "content" TYPE varchar USING COALESCE("content"::text, NULL);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ALTER COLUMN "content" TYPE jsonb USING NULL;
  `)
}
