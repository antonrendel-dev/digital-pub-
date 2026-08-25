import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import PageShell from '@/components/PageShell'
import VacancyGrid from '@/components/VacancyGrid'
import { ogImageUrl } from '@/lib/og'
import { getPostsByProfession } from '@/lib/posts'
import { PROFESSIONS, PROFESSIONS_MEASURED_AT, PROFESSION_SLUGS } from '@/lib/professions'

const BASE_URL = 'https://d-pub.ru'

export function generateStaticParams() {
  return PROFESSION_SLUGS.map((slug) => ({ slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const profession = PROFESSIONS[slug]
  if (!profession) return { title: 'Профессия не найдена' }

  const canonical = `${BASE_URL}/professions/${profession.slug}`
  return {
    title: profession.metaTitle,
    description: profession.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: profession.metaTitle,
      description: profession.metaDescription,
      url: canonical,
      type: 'article',
      images: [
        {
          url: ogImageUrl({
            title: profession.nameNominative,
            subtitle: 'Зарплаты, требования и вакансии',
          }),
          width: 1200,
          height: 630,
          alt: profession.metaTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: profession.metaTitle,
      description: profession.metaDescription,
    },
  }
}

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

export default async function ProfessionPage({ params }: Props) {
  const { slug } = await params
  const profession = PROFESSIONS[slug]
  if (!profession) notFound()

  const { posts, total } = await getPostsByProfession(profession.queries)

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Профессии', item: `${BASE_URL}/professions` },
      {
        '@type': 'ListItem',
        position: 3,
        name: profession.nameNominative,
        item: `${BASE_URL}/professions/${profession.slug}`,
      },
    ],
  }

  // Occupation, а не ItemList — это то, чем карточка профессии отличается от
  // листинга для поисковика. ItemList здесь поставить нельзя: он сообщает
  // «это перечень», и страница начнёт конкурировать с /vacancies/{направление}.
  //
  // estimatedSalary заполняется только реальной статистикой по нашим вакансиям
  // и только при выборке от 15 штук. Выдуманная вилка в разметке — прямой риск.
  const occupationLd = {
    '@context': 'https://schema.org',
    '@type': 'Occupation',
    name: profession.nameNominative,
    description: profession.metaDescription,
    occupationLocation: { '@type': 'Country', name: 'Россия' },
    skills: profession.tools.map((t) => t.name).join(', '),
    responsibilities: profession.responsibilities.join('; '),
    ...(profession.salary
      ? {
          estimatedSalary: {
            '@type': 'MonetaryAmountDistribution',
            name: 'base',
            currency: 'RUB',
            duration: 'P1M',
            percentile25: profession.salary.p25,
            median: profession.salary.median,
            percentile75: profession.salary.p75,
          },
        }
      : {}),
  }

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: profession.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const topTool = profession.tools[0]

  return (
    <PageShell>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={occupationLd} />
      <JsonLd data={faqLd} />

      <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="no-underline hover:text-text transition-colors">
            Главная
          </Link>
          <span>&#8250;</span>
          <Link href="/professions" className="no-underline hover:text-text transition-colors">
            Профессии
          </Link>
          <span>&#8250;</span>
          <span className="text-text">{profession.nameNominative}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-text mb-4">{profession.h1}</h1>

        <p className="text-text-muted leading-relaxed mb-8">{profession.intro}</p>

        {profession.salary && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-text mb-3">Сколько платят</h2>
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[
                { label: 'Четверть ниже', value: profession.salary.p25 },
                { label: 'Медиана', value: profession.salary.median },
                { label: 'Четверть выше', value: profession.salary.p75 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-bg-card border border-border rounded-lg px-4 py-3">
                  <div className="text-xs text-text-muted mb-1">{label}</div>
                  <div className="font-semibold text-text">{rub(value)}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-light">
              Посчитано по {profession.salary.sample} вакансиям с указанной зарплатой из нашей базы,
              замер от {PROFESSIONS_MEASURED_AT}. Это не оценка рынка, а то, что реально пишут
              работодатели в Telegram-каналах.
            </p>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text mb-3">Чем занимается</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-muted">
            {profession.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {/*
          Мост «профессия → инструмент». Считается по нашим же вакансиям, поэтому
          отвечает на вопрос, на который не отвечают ни hh, ни Telegram-каналы:
          не «что полезно знать», а «что просят прямо сейчас и в скольких вакансиях».
        */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text mb-1">Что просят работодатели</h2>
          <p className="text-xs text-text-light mb-4">
            По {profession.vacanciesAtMeasure} вакансиям профессии, замер от{' '}
            {PROFESSIONS_MEASURED_AT}
          </p>
          <div className="space-y-2">
            {profession.tools.map((tool) => {
              const row = (
                <>
                  <span className="font-medium text-text">{tool.name}</span>
                  <span className="text-sm text-text-muted">
                    в {tool.count} из {profession.vacanciesAtMeasure}
                  </span>
                </>
              )
              return tool.toolSlug ? (
                <Link
                  key={tool.name}
                  href={`/tools/${tool.toolSlug}`}
                  className="flex items-center justify-between gap-3 no-underline bg-bg-card border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors"
                >
                  {row}
                </Link>
              ) : (
                <div
                  key={tool.name}
                  className="flex items-center justify-between gap-3 bg-bg-card border border-border rounded-lg px-4 py-3"
                >
                  {row}
                </div>
              )
            })}
          </div>
          {topTool && (
            <p className="text-sm text-text-muted mt-3">
              Чаще всего в требованиях встречается {topTool.name} — {topTool.count} упоминаний из{' '}
              {profession.vacanciesAtMeasure}. Одного инструмента обычно мало: в большинстве
              вакансий их просят в связке.
            </p>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text mb-3">С чего начать</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-text-muted">
            {profession.howToStart.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text mb-3">
            Вакансии {profession.name} — {total} на сегодня
          </h2>
          {posts.length === 0 ? (
            <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
              Сейчас нет открытых вакансий по этой профессии
            </div>
          ) : (
            <>
              <VacancyGrid posts={posts} />
              {/*
                Транзакционный сигнал уходит вниз, к листингу: анкор несёт ключ
                листинга, а не этой страницы. Обратная ссылка с листинга сюда
                должна быть информационной — «кто такой ...».
              */}
              <p className="text-sm text-text-muted mt-4">
                Показаны свежие. Все —{' '}
                <Link href={profession.relatedListing.href} className="text-accent">
                  {profession.relatedListing.label}
                </Link>
                .
              </p>
            </>
          )}
        </section>

        <section className="pt-6 border-t border-border">
          <h2 className="text-lg font-semibold text-text mb-4">Частые вопросы</h2>
          <div className="space-y-3">
            {profession.faq.map(({ q, a }) => (
              <details key={q} className="group border border-border rounded-lg">
                <summary className="flex justify-between items-center cursor-pointer px-4 py-3 text-sm font-medium text-text list-none">
                  {q}
                  <span className="text-text-muted group-open:rotate-180 transition-transform">
                    &#9662;
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-1 text-sm text-text-muted">{a}</div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
