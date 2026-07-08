import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { PageShellWrapper } from '@/components/PageShellWrapper'
import { LeftSidebarServer } from '@/components/LeftSidebarServer'
import RightSidebar from '@/components/RightSidebar'
import { getTagsWithCounts } from '@/lib/tags'
import { getArticles, formatArticleDate } from '@/lib/articles'

export const metadata: Metadata = {
  title: 'О сервисе — Диджитал Паб',
  description:
    'Диджитал Паб — агрегатор вакансий и резюме в digital-сфере. Собираем актуальные предложения из Telegram-каналов и структурируем по специализациям.',
  alternates: { canonical: 'https://d-pub.ru/about' },
  openGraph: {
    title: 'О сервисе — Диджитал Паб',
    description:
      'Диджитал Паб — агрегатор вакансий и резюме в digital-сфере. Собираем актуальные предложения из Telegram-каналов и структурируем по специализациям.',
    url: 'https://d-pub.ru/about',
    type: 'website',
    images: [
      { url: 'https://d-pub.ru/og-image.png', width: 1200, height: 630, alt: 'Диджитал Паб' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'О сервисе — Диджитал Паб',
    description:
      'Диджитал Паб — агрегатор вакансий и резюме в digital-сфере. Собираем актуальные предложения из Telegram-каналов и структурируем по специализациям.',
  },
}

const BASE_URL = 'https://d-pub.ru'

const CATEGORIES = [
  { href: '/vacancies/smm', label: 'SMM' },
  { href: '/vacancies/marketing', label: 'Маркетинг' },
  { href: '/vacancies/dizajn', label: 'Дизайн' },
  { href: '/vacancies/seo', label: 'SEO' },
  { href: '/vacancies/target', label: 'Таргет' },
  { href: '/vacancies/razrabotka', label: 'Разработка' },
  { href: '/vacancies/analitika', label: 'Аналитика' },
  { href: '/vacancies/copywriting', label: 'Копирайтинг' },
  { href: '/vacancies/content', label: 'Контент' },
  { href: '/vacancies/kreativ', label: 'Креатив' },
  { href: '/vacancies/menedzher', label: 'Менеджмент' },
  { href: '/vacancies/finansy', label: 'Финансы' },
]

export default async function AboutPage() {
  const [tags, articlesMeta] = await Promise.all([
    getTagsWithCounts().catch(() => []),
    Promise.resolve(getArticles()),
  ])
  const articles = articlesMeta.map((a) => ({
    title: a.title,
    slug: a.slug,
    date: formatArticleDate(a.publishedAt),
  }))

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'О сервисе', item: `${BASE_URL}/about` },
    ],
  }

  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://d-pub.ru/#organization',
    name: 'Диджитал Паб',
    url: BASE_URL,
    description:
      'Агрегатор вакансий и резюме в digital-сфере. Собираем предложения из публичных Telegram-каналов и структурируем по специализациям.',
    sameAs: ['https://t.me/resume_vac_bot'],
  }

  return (
    <PageShellWrapper>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={organizationLd} />
      <div className="max-w-wrap mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-layout gap-0 lg:gap-6">
          {/* Left sidebar */}
          <aside className="hidden lg:block">
            <LeftSidebarServer />
          </aside>

          {/* Center column */}
          <div className="min-w-0">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
              <Link
                href="/"
                className="text-text-muted no-underline hover:text-accent transition-colors"
              >
                Главная
              </Link>
              <span className="text-text-light">&rsaquo;</span>
              <span className="text-text-light">О сервисе</span>
            </nav>

            {/* Hero image */}
            <div className="mb-6 rounded-xl overflow-hidden border border-border">
              <Image
                src="/images/hero-pub.webp"
                alt="Диджитал Паб — место встречи digital-специалистов"
                width={900}
                height={450}
                className="w-full object-cover"
                priority
              />
            </div>

            {/* H1 */}
            <h1 className="text-2xl font-bold text-text tracking-tight mb-6">
              О сервисе Диджитал Паб
            </h1>

            <div className="space-y-8 text-sm text-text-muted leading-relaxed">
              <section>
                <h2 className="text-lg font-semibold text-text mb-3">Что такое Диджитал Паб</h2>
                <p>
                  Диджитал Паб — это агрегатор вакансий и резюме для специалистов digital-индустрии.
                  Мы собираем актуальные предложения о работе из публичных Telegram-каналов и
                  публикуем их в удобном структурированном виде на d-pub.ru.
                </p>
                <p className="mt-3">
                  Вам не нужно мониторить десятки каналов вручную. Всё, что публикуется в крупных
                  профессиональных сообществах по SMM, маркетингу, дизайну, разработке и другим
                  направлениям — уже собрано в одном месте и отсортировано по специализации.
                </p>
                <p className="mt-3">
                  Сервис работает без регистрации. Открыл, выбрал направление, нашёл подходящую
                  вакансию — перешёл напрямую к работодателю в Telegram. Никаких посредников и
                  платных функций.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-text mb-3">Как работает агрегация</h2>
                <p>
                  Основа сервиса — автоматический парсинг публичных Telegram-каналов, которые
                  посвящены поиску работы в digital. Мы отслеживаем каналы с вакансиями по
                  маркетингу, SMM, дизайну, контенту, разработке и смежным специальностям.
                </p>
                <p className="mt-3">
                  Каждая публикация проходит автоматическую разметку: определяется специализация,
                  формат занятости (офис, удалёнка, гибрид) и грейд (junior, middle, senior). После
                  этого вакансия попадает в соответствующую категорию на сайте.
                </p>
                <p className="mt-3">
                  База обновляется ежедневно. Устаревшие объявления не накапливаются — вы видите
                  только актуальные предложения. Источник каждой вакансии указан: можно перейти в
                  оригинальный Telegram-канал и уточнить детали напрямую.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-text mb-3">
                  Прозрачность и актуальность
                </h2>
                <p>
                  Мы не редактируем содержание вакансий и не фильтруем предложения по собственным
                  критериям. Всё, что публикуется в открытых источниках — попадает к вам в
                  неизменном виде со ссылкой на автора.
                </p>
                <p className="mt-3">
                  Три принципа, на которых работает сервис. Первый — только публичные источники:
                  парсим исключительно открытые Telegram-каналы, доступные любому пользователю.
                  Второй — ежедневное обновление: база пополняется регулярно, устаревшие объявления
                  удаляются автоматически. Третий — структура по специализациям: вакансии разбиты на
                  12 категорий, чтобы вы сразу попали в нужный раздел.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-text mb-3">
                  Для кого создан Диджитал Паб
                </h2>
                <p>
                  Прежде всего — для digital-специалистов, которые ищут работу: маркетологов,
                  дизайнеров, SMM-менеджеров, таргетологов, аналитиков, разработчиков, копирайтеров
                  и контент-мейкеров. Сервис одинаково полезен и тем, кто ищет штатную позицию, и
                  фрилансерам в поиске проектной занятости.
                </p>
                <p className="mt-3">
                  HR-специалисты и рекрутеры используют Диджитал Паб, чтобы разместить вакансию
                  через наш{' '}
                  <a
                    href="https://t.me/resume_vac_bot"
                    className="text-accent underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Telegram-бот
                  </a>{' '}
                  и охватить целевую аудиторию профессионалов digital-рынка.
                </p>
                <p className="mt-3">
                  Если вы ищете не работу, а специалиста — раздел{' '}
                  <Link
                    href="/resumes"
                    className="text-accent underline hover:opacity-80 transition-opacity"
                  >
                    резюме
                  </Link>{' '}
                  содержит анкеты digital-профессионалов, которые открыты к предложениям прямо
                  сейчас.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-text mb-4">
                  Популярные категории вакансий
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="bg-bg-card border border-border rounded-lg px-3 py-2.5 text-text-muted no-underline hover:text-text hover:border-accent transition-colors text-center font-medium"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="bg-bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-text mb-2">
                  Разместить вакансию или резюме
                </h2>
                <p>
                  Хотите, чтобы ваша вакансия появилась на Диджитал Паб? Напишите нашему
                  Telegram-боту — публикация занимает несколько минут.
                </p>
                <a
                  href="https://t.me/resume_vac_bot"
                  className="inline-block mt-4 px-5 py-2.5 bg-accent text-bg-card font-semibold rounded-lg no-underline hover:opacity-90 transition-opacity text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Написать в Telegram-бот
                </a>
              </section>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="hidden lg:block">
            <RightSidebar tags={tags} articles={articles} />
          </aside>
        </div>
      </div>
    </PageShellWrapper>
  )
}
