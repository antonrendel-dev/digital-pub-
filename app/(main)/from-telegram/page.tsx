import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShellWrapper } from '@/components/PageShellWrapper'
import JsonLd from '@/components/JsonLd'

const BASE_URL = 'https://d-pub.ru'
const CANONICAL = `${BASE_URL}/from-telegram`

// Бренд в <title> добавляет шаблон layout. В og:title его надо ставить явно:
// siteName из layout не наследуется, если страница задаёт свой openGraph.
const TITLE = 'Вакансии digital-специалистов из Telegram'
const SOCIAL_TITLE = `${TITLE} — Диджитал Паб`
const DESCRIPTION =
  'Агрегатор вакансий из Telegram-каналов для digital-специалистов. SMM, маркетинг, дизайн, аналитика — актуальные вакансии из профессиональных Telegram-чатов.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    type: 'website',
    images: [
      { url: 'https://d-pub.ru/og-image.png', width: 1200, height: 630, alt: 'Диджитал Паб' },
    ],
  },
  twitter: { card: 'summary_large_image', title: SOCIAL_TITLE, description: DESCRIPTION },
}

// Кириллическое «телеграм» на странице до 22.08.2026 не встречалось ни разу —
// весь текст был написан латиницей. Замер Вордстата: «работа в телеграм» и
// «вакансии в телеграме» ищут кириллицей, и без единого вхождения страница по
// этим запросам не отвечает вовсе.
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Как найти работу в телеграме?',
    a: 'Работа в телеграм ищется двумя способами. Первый — подписаться на профильные каналы и читать ленту вручную: придётся следить за тремя десятками источников и рисковать пропустить вакансию, которая живёт два-три дня. Второй — открыть агрегатор: Диджитал Паб собирает вакансии из тех же каналов автоматически, раскладывает по специализациям и даёт поиск с фильтрами. Отклик в обоих случаях уходит напрямую автору поста.',
  },
  {
    q: 'Какие вакансии в телеграме публикуют чаще всего?',
    a: 'Основной поток — digital: SMM и контент, таргет, маркетинг, дизайн, копирайтинг, аналитика, SEO и разработка. Заметно больше предложений от агентств, продуктовых команд и небольшого бизнеса, чем от корпораций. Много удалёнки и проектной занятости — форматов, которые на классических job-бордах представлены слабее.',
  },
  {
    q: 'Нужна ли регистрация, чтобы смотреть вакансии из телеграм-каналов?',
    a: 'Нет. Сервис открыт полностью: ни регистрации, ни подписки, ни платных функций. Открываешь категорию, смотришь свежие вакансии, переходишь к работодателю. Аккаунт в Telegram понадобится только на последнем шаге — чтобы написать автору вакансии.',
  },
  {
    q: 'Как часто обновляются вакансии?',
    a: 'Несколько раз в сутки. Парсер обходит источники и добавляет новые публикации в базу, поэтому список за сегодня почти всегда непустой. Устаревшие карточки закрываются от индексации, чтобы в выдачу не попадали вакансии, которых уже нет.',
  },
  {
    q: 'Чем телеграм-вакансии отличаются от hh.ru?',
    a: 'Скоростью и составом рынка. В телеграме публикуют, когда человек нужен сейчас, — без длинной воронки, HR-скрининга и шаблонных описаний должностей. Взамен нет единого стандарта карточки: где-то указана вилка, где-то нет, требования сформулированы свободным текстом. Мы приводим это к общему виду, но сам текст вакансии оставляем авторским.',
  },
  {
    q: 'Можно ли разместить свою вакансию или резюме?',
    a: 'Да, через бота @resume_vac_bot. Заявка проходит модерацию и попадает в общий поток вместе с вакансиями, собранными из каналов. Размещение бесплатное.',
  },
]

const CATEGORIES = [
  { href: '/vacancies/smm', label: 'SMM', description: 'SMM-менеджеры и контент-мейкеры' },
  {
    href: '/vacancies/marketing',
    label: 'Маркетинг',
    description: 'Маркетологи всех специализаций',
  },
  { href: '/vacancies/dizajn', label: 'Дизайн', description: 'UI/UX, графика, моушн' },
  {
    href: '/vacancies/copywriting',
    label: 'Копирайтинг',
    description: 'Авторы, редакторы, контент-стратеги',
  },
  { href: '/vacancies/target', label: 'Таргет', description: 'Таргетологи и PPC-специалисты' },
  { href: '/vacancies/seo', label: 'SEO', description: 'SEO-специалисты и линкбилдеры' },
  { href: '/vacancies/analitika', label: 'Аналитика', description: 'Веб и продуктовые аналитики' },
  {
    href: '/vacancies/razrabotka',
    label: 'Разработка',
    description: 'Frontend, backend, fullstack',
  },
]

export default function FromTelegramPage() {
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${CANONICAL}#webpage`,
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    isPartOf: { '@id': `${BASE_URL}/#website` },
    publisher: {
      '@type': 'Organization',
      name: 'Диджитал Паб',
      url: BASE_URL,
    },
    inLanguage: 'ru',
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Вакансии из Telegram', item: CANONICAL },
    ],
  }

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <PageShellWrapper>
      <JsonLd data={webPageLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-text-light mb-6 flex items-center gap-1">
          <Link href="/" className="hover:text-text transition-colors no-underline">
            Главная
          </Link>
          <span>/</span>
          <span className="text-text-muted">Вакансии из Telegram</span>
        </nav>

        {/* H1 */}
        <h1 className="text-2xl md:text-3xl font-bold text-text mb-4">
          Вакансии из Telegram-каналов
        </h1>

        <p className="text-text-muted mb-8 text-base leading-relaxed">
          Агрегатор digital-вакансий, которые публикуются в профессиональных Telegram-каналах —
          автоматически, ежедневно, без ручного поиска.
        </p>

        {/* SEO-текст */}
        <div className="prose prose-neutral dark:prose-invert max-w-none text-text space-y-5 text-sm leading-relaxed mb-10">
          <h2 className="text-lg font-semibold text-text mt-0">Откуда берутся вакансии</h2>
          <p>
            Диджитал Паб автоматически собирает вакансии из десятков профессиональных
            Telegram-каналов: агентства публикуют открытые позиции, HR-менеджеры анонсируют наборы в
            команду, стартапы ищут первых сотрудников. Бот парсит эти объявления и добавляет их в
            единую базу — несколько раз в сутки.
          </p>
          <p>
            Источники охватывают все ключевые направления digital-рынка: SMM и контент, маркетинг и
            перформанс, дизайн и UX, разработку, аналитику, SEO и таргет. Каждая карточка вакансии
            ссылается на оригинальный пост в Telegram — связаться с работодателем можно напрямую,
            без посредников.
          </p>

          <h2 className="text-lg font-semibold text-text">Работа в телеграме: как устроен рынок</h2>
          <p>
            Запрос «работа в телеграм» перестал быть нишевым: канал с вакансиями сегодня заводит
            почти каждое агентство, а часть команд вообще не выходит за пределы мессенджера при
            найме. Причина простая — публикация занимает минуту, аудитория читает её сразу, а отклик
            приходит в тот же чат. Для соискателя это означает, что заметная часть предложений
            существует только в телеграме и на классических job-бордах не появляется никогда.
          </p>
          <p>
            Обратная сторона — формат. Вакансия в телеграме живёт два-три дня и уходит вниз ленты,
            поиска по каналу почти нет, а фильтров по грейду, формату работы и специализации нет
            вовсе. Именно эту часть работы мы и берём на себя: собираем публикации, размечаем их
            тегами и отдаём в виде, где вакансии в телеграме можно отобрать по направлению и
            посмотреть за нужный день.
          </p>

          <h2 className="text-lg font-semibold text-text">Какие Telegram-каналы агрегируются</h2>
          <p>
            Мы мониторим профессиональные чаты и каналы для digital-специалистов: сообщества
            маркетологов, дизайнерские гильдии, чаты SMM-менеджеров, группы разработчиков. В отличие
            от общих досок объявлений, вакансии из Telegram — это живые предложения от реальных
            команд, часто без бюрократии и формальных требований к отклику.
          </p>
          <p>
            Telegram стал основной площадкой для найма в digital: руководители предпочитают писать о
            вакансиях своей аудитории напрямую, минуя hh.ru и LinkedIn. Именно здесь появляются
            срочные позиции, нестандартные форматы занятости и вакансии без публичного размещения.
          </p>

          <h2 className="text-lg font-semibold text-text">
            Почему это лучше, чем мониторить каналы вручную
          </h2>
          <p>
            Вручную следить за 30+ Telegram-каналами — это ежедневная рутина: уведомления,
            скроллинг, риск пропустить нужное. Диджитал Паб решает эту задачу: все вакансии из
            разных каналов появляются в одном месте, структурированные по категориям и датам.
          </p>
          <p>
            Не нужно вступать в каждый канал, настраивать уведомления или листать ленту. Открыл
            нужную категорию — увидел свежие вакансии за сегодня. Без регистрации, без подписки,
            бесплатно.
          </p>

          <h2 className="text-lg font-semibold text-text">Как найти вакансию</h2>
          <p>
            Перейди в нужную категорию ниже или открой{' '}
            <Link href="/vacancies" className="text-blue-500 hover:text-blue-400 transition-colors">
              весь список вакансий
            </Link>
            . Каждая карточка содержит название позиции, описание, формат работы и ссылку на
            оригинальный пост. Нажми — и попадёшь напрямую к работодателю в Telegram.
          </p>
        </div>

        {/* Блок категорий */}
        <div className="mb-10">
          <h2 className="text-base font-semibold text-text-muted uppercase tracking-wide mb-4">
            Вакансии по категориям
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group flex flex-col gap-0.5 rounded-lg border border-border bg-bg-card px-4 py-3 no-underline hover:border-blue-500/50 hover:bg-bg-card/80 transition-all duration-150"
              >
                <span className="text-sm font-semibold text-text group-hover:text-blue-500 transition-colors">
                  {cat.label}
                </span>
                <span className="text-xs text-text-light">{cat.description}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <section className="mb-10 pt-6 border-t border-border">
          <h2 className="text-lg font-semibold text-text mb-4">Частые вопросы</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map(({ q, a }, i) => (
              <details key={i} className="group border border-border rounded-lg">
                <summary className="flex justify-between items-center cursor-pointer px-4 py-3 text-sm font-medium text-text list-none">
                  {q}
                  <span className="text-text-muted group-open:rotate-180 transition-transform">
                    &#9662;
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-1 text-sm text-text-muted leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-lg border border-border bg-bg-card px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-text mb-1">Смотри все вакансии из Telegram</p>
            <p className="text-xs text-text-light">
              Новые вакансии появляются несколько раз в день. Обновляй страницу — находи свежее.
            </p>
          </div>
          <Link
            href="/vacancies"
            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 transition-colors no-underline"
          >
            Все вакансии
          </Link>
        </div>
      </div>
    </PageShellWrapper>
  )
}
