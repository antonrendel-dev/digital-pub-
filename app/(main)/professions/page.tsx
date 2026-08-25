import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import PageShell from '@/components/PageShell'
import { getPostsByProfession } from '@/lib/posts'
import { PROFESSIONS, PROFESSIONS_MEASURED_AT } from '@/lib/professions'

const BASE_URL = 'https://d-pub.ru'

export const revalidate = 600

/**
 * Хаб профессий.
 *
 * Целевой ключ — «digital профессии» (176/мес), а не «удалённые профессии»
 * (6 458/мес). Второй выглядит заманчиво, но это тот же класс запросов, что
 * «удалённая работа» (494 449/мес), по которому наша страница за 90 дней
 * получила ноль показов: голову держат hh, Работа.ру и сервисы Яндекса.
 * Хаб живёт не головой, а тем, что раздаёт вес карточкам.
 */
export const metadata: Metadata = {
  title: 'Профессии в digital — зарплаты, навыки и вакансии',
  description:
    'Профессии в digital: чем занимаются, сколько платят и что просят работодатели. Цифры посчитаны по живым вакансиям из Telegram-каналов, а не взяты из обзоров рынка.',
  alternates: { canonical: `${BASE_URL}/professions` },
  openGraph: {
    title: 'Профессии в digital — зарплаты, навыки и вакансии',
    description:
      'Чем занимаются, сколько платят и что просят работодатели — по живым вакансиям из Telegram.',
    url: `${BASE_URL}/professions`,
    type: 'website',
    images: [
      { url: 'https://d-pub.ru/og-image.png', width: 1200, height: 630, alt: 'Диджитал Паб' },
    ],
  },
}

const rub = (n: number) => `${Math.round(n / 1000)}К`

export default async function ProfessionsHubPage() {
  const professions = Object.values(PROFESSIONS)

  const counts = await Promise.all(
    professions.map(async (p) => {
      const { total } = await getPostsByProfession(p.queries, 1)
      return { profession: p, total }
    })
  )

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Профессии', item: `${BASE_URL}/professions` },
    ],
  }

  // ItemList уместен именно здесь: хаб и есть перечень. На карточках профессий
  // его быть не должно — там Occupation, и это их отличает от листингов.
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Профессии в digital',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: professions.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.nameNominative,
        url: `${BASE_URL}/professions/${p.slug}`,
      })),
    },
  }

  return (
    <PageShell>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />
      <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="no-underline hover:text-text transition-colors">
            Главная
          </Link>
          <span>&#8250;</span>
          <span className="text-text">Профессии</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Профессии в digital</h1>
        <p className="text-text-muted mb-8 max-w-2xl">
          Чем занимается, сколько платят и что просят работодатели. Зарплаты и требования посчитаны
          по живым вакансиям из Telegram-каналов, а не взяты из обзоров рынка.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {counts.map(({ profession, total }) => (
            <Link
              key={profession.slug}
              href={`/professions/${profession.slug}`}
              className="group block no-underline bg-bg-card border border-border rounded-xl p-5 hover:border-accent hover:shadow-sm transition-all"
            >
              <div className="font-semibold text-text group-hover:text-accent transition-colors mb-1">
                {profession.nameNominative}
              </div>
              <div className="text-sm text-text-muted mb-3">
                {total > 0 ? (
                  <>
                    <strong className="text-text">{total}</strong> вакансий сейчас
                  </>
                ) : (
                  'Сейчас вакансий нет'
                )}
              </div>
              {profession.salary && (
                <div className="text-sm text-text-muted">
                  Медиана <strong className="text-text">{rub(profession.salary.median)}</strong> ·
                  от {rub(profession.salary.p25)} до {rub(profession.salary.p75)}
                </div>
              )}
              <div className="text-xs text-text-light mt-3">
                Чаще всего просят:{' '}
                {profession.tools
                  .slice(0, 3)
                  .map((t) => t.name)
                  .join(', ')}
              </div>
            </Link>
          ))}
        </div>

        <p className="text-xs text-text-light mt-8">
          Цифры — замер от {PROFESSIONS_MEASURED_AT} по нашей базе вакансий. Профессия попадает в
          раздел, только если по ней есть и спрос в поиске, и живые вакансии: страница-обещание без
          вакансий хуже её отсутствия.
        </p>
      </div>
    </PageShell>
  )
}
