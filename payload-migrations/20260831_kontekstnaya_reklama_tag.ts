import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Категория «Контекстная реклама» — единственный кандидат на новую посадочную,
 * прошедший оба гейта: спрос 283/мес по четырём ключам и 47 живых вакансий,
 * из них 21 за последние 30 дней.
 *
 * Границы соседей проверены: /tools/yandex-direct отвечает инструментальному
 * интенту («умею настраивать Директ — кем возьмут»), эта страница — професси-
 * ональному («вакансии контекстолога»); /vacancies/target остаётся про таргет
 * и медиабайинг.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "tags" ("name", "slug", "tag_type", "seo_title", "seo_description", "updated_at", "created_at")
    VALUES (
      'Контекстная реклама',
      'kontekstnaya-reklama',
      'specialization',
      'Вакансии контекстолога 2026 — Яндекс.Директ и Google Ads',
      'Вакансии специалиста по контекстной рекламе: Яндекс.Директ, Google Ads, PPC. Удалённо, офис и гибрид — обновляется ежедневно.',
      NOW(),
      NOW()
    )
    ON CONFLICT ("slug") DO NOTHING;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "posts_rels"
    WHERE "path" = 'tags'
      AND "tags_id" = (SELECT "id" FROM "tags" WHERE "slug" = 'kontekstnaya-reklama');
    DELETE FROM "tags" WHERE "slug" = 'kontekstnaya-reklama';
  `)
}
