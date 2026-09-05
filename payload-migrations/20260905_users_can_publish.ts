import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * S21 (аудит 04.09.2026): завод публикует статьи не паролем админа, а своим
 * пользователем роли agent с флагом canPublish. Флаг ставит только админ
 * (field-level access в payload/collections/users.ts).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_publish" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "can_publish";
  `)
}
