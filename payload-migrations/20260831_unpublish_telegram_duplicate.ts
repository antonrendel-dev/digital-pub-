import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Статья kak-najti-rabotu-v-digital-cherez-telegram дублирует по интенту
 * kak-nayti-rabotu-telegram-digital, которая живёт в MDX. Обе не получили ни
 * одного показа за 90 дней — для двух страниц под один запрос это ожидаемо.
 *
 * Уводим в черновики, а не удаляем: текст остаётся в базе, из sitemap запись
 * уходит сама (шард берёт только published), сам адрес закрыт редиректом
 * в next.config.mjs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "articles"
    SET "status" = 'draft', "updated_at" = NOW()
    WHERE "slug" = 'kak-najti-rabotu-v-digital-cherez-telegram';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "articles"
    SET "status" = 'published', "updated_at" = NOW()
    WHERE "slug" = 'kak-najti-rabotu-v-digital-cherez-telegram';
  `)
}
