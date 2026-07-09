import type { Metadata } from 'next'
import Link from 'next/link'
import { getPostsByTool } from '@/lib/posts'
import PageShell from '@/components/PageShell'
import JsonLd from '@/components/JsonLd'

export const revalidate = 60

const BASE_URL = 'https://d-pub.ru'

const TOOLS = [
  { slug: 'capcut', name: 'CapCut', query: 'capcut' },
  { slug: 'figma', name: 'Figma', query: 'figma' },
  { slug: 'yandex-metrika', name: 'Яндекс.Метрика', query: 'метрик' },
  { slug: 'chatgpt', name: 'ChatGPT', query: 'chatgpt' },
  { slug: 'canva', name: 'Canva', query: 'canva' },
  { slug: 'screaming-frog', name: 'Screaming Frog', query: 'screaming frog' },
  { slug: 'semrush', name: 'Semrush', query: 'semrush' },
  { slug: 'tilda', name: 'Tilda', query: 'tilda' },
  { slug: 'midjourney', name: 'Midjourney', query: 'midjourney' },
  { slug: 'google-analytics', name: 'Google Analytics', query: 'google analytics' },
  { slug: 'yandex-direct', name: 'Яндекс.Директ', query: 'яндекс.директ' },
  { slug: 'photoshop', name: 'Photoshop', query: 'photoshop' },
  { slug: 'tablicy', name: 'Google Таблицы', query: 'таблиц' },
]

export const metadata: Metadata = {
  title: 'Вакансии по навыкам digital-специалистов — d-pub.ru',
  description:
    'Вакансии в digital по навыкам и программам: Figma, Canva, ChatGPT, CapCut, Photoshop, Tilda. Актуальные вакансии для SMM, дизайнеров, маркетологов из Telegram.',
  alternates: { canonical: `${BASE_URL}/tools` },
  openGraph: {
    title: 'Вакансии по навыкам digital-специалистов — d-pub.ru',
    description:
      'Вакансии в digital по навыкам и программам: Figma, Canva, ChatGPT, CapCut, Photoshop, Tilda. Из Telegram-каналов.',
    url: `${BASE_URL}/tools`,
    type: 'website',
    images: [
      { url: 'https://d-pub.ru/og-image.png', width: 1200, height: 630, alt: 'Диджитал Паб' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Вакансии по навыкам digital-специалистов — d-pub.ru',
    description:
      'Вакансии в digital по навыкам и программам: Figma, Canva, ChatGPT, CapCut, Photoshop, Tilda. Из Telegram-каналов.',
  },
}

export default async function ToolsHubPage() {
  const toolsWithCounts = await Promise.all(
    TOOLS.map(async (tool) => {
      const { total } = await getPostsByTool(tool.query, 1, 1)
      return { ...tool, count: total }
    })
  )

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Навыки', item: `${BASE_URL}/tools` },
    ],
  }

  return (
    <PageShell>
      <JsonLd data={breadcrumbLd} />
      <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="no-underline hover:text-text transition-colors">
            Главная
          </Link>
          <span>&#8250;</span>
          <span className="text-text">Навыки</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Вакансии по навыкам</h1>
        <p className="text-text-muted mb-8">
          Вакансии digital-специалистов, сгруппированные по навыкам и программам
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {toolsWithCounts.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group block no-underline bg-bg-card border border-border rounded-xl p-5 hover:border-accent hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-text group-hover:text-accent transition-colors mb-1">
                    {tool.name}
                  </div>
                  <div className="text-sm text-text-muted">
                    {tool.count > 0 ? (
                      <>
                        <strong className="text-text">{tool.count}</strong> вакансий
                      </>
                    ) : (
                      'Нет вакансий'
                    )}
                  </div>
                </div>
                <span className="text-text-muted group-hover:text-accent transition-colors text-lg">
                  &#8250;
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-sm text-text-muted space-y-4">
          <h2 className="text-lg font-semibold text-text mb-3">
            Вакансии по навыкам: как искать работу в digital по конкретным программам
          </h2>

          <p>
            Рынок digital в 2026 году изменился: работодатели всё реже пишут «опыт в маркетинге» и
            всё чаще перечисляют конкретные инструменты прямо в тексте вакансии. Figma, Canva,
            ChatGPT, CapCut, Photoshop, Tilda, Яндекс.Метрика, Яндекс.Директ, Semrush, Screaming
            Frog, Midjourney, Google Analytics, Google Таблицы — если вы знаете хотя бы один из них
            на уровне выше среднего, это уже конкурентное преимущество. Страница «Вакансии по
            навыкам» позволяет зайти с другой стороны: не листать все объявления подряд, а сразу
            отфильтровать те, где ваш ключевой навык указан как требование.
          </p>

          <p>
            Каждая карточка на странице — это отдельный навык или программа, упомянутая в реальных
            вакансиях из Telegram-каналов digital-тематики. Вакансии обновляются автоматически
            несколько раз в день, поэтому в выдаче всегда актуальные предложения, а не архив
            двухлетней давности.
          </p>

          <h2 className="text-lg font-semibold text-text mt-6 mb-3">
            Какие навыки и в каких специализациях востребованы
          </h2>

          <p>
            <strong className="text-text">Дизайн.</strong>{' '}
            <Link href="/vacancies/dizajn" className="text-accent hover:underline no-underline">
              Вакансии дизайнера
            </Link>{' '}
            чаще всего требуют Figma — как для UX/UI-проектирования, так и для product-дизайна и
            подготовки макетов под разработку. Photoshop остаётся стандартом для графических
            дизайнеров и арт-директоров, Midjourney всё активнее появляется в требованиях к
            дизайнерам контента и креативным директорам.
          </p>

          <p>
            <strong className="text-text">SMM и контент.</strong>{' '}
            <Link href="/vacancies/smm" className="text-accent hover:underline no-underline">
              Вакансии SMM-специалиста
            </Link>{' '}
            почти всегда включают Canva или CapCut — либо оба сразу. Canva — для статичного контента
            и сторис, CapCut — для Reels и коротких видео. Специалисты, знающие оба инструмента на
            уровне шаблонов и брендбука, получают офферы быстрее.
          </p>

          <p>
            <strong className="text-text">Маркетинг и реклама.</strong>{' '}
            <Link href="/vacancies/marketing" className="text-accent hover:underline no-underline">
              Вакансии маркетолога
            </Link>{' '}
            и{' '}
            <Link href="/vacancies/target" className="text-accent hover:underline no-underline">
              таргетолога
            </Link>{' '}
            требуют Яндекс.Директ, Google Analytics, Яндекс.Метрику и Tilda. ChatGPT всё чаще идёт
            отдельным пунктом — как навык ускорения написания текстов, брифов и гипотез. Умение
            работать с нейросетями в маркетинге уже перешло из «плюса» в базовое ожидание.
          </p>

          <p>
            <strong className="text-text">SEO.</strong>{' '}
            <Link href="/vacancies/seo" className="text-accent hover:underline no-underline">
              Вакансии SEO-специалиста
            </Link>{' '}
            делятся на контентные и технические. Для технического SEO ключевые навыки — Screaming
            Frog и Semrush: первый для краулинга и аудита, второй для анализа ключей и конкурентов.
            Яндекс.Метрика и Google Analytics нужны в обоих направлениях.
          </p>

          <p>
            <strong className="text-text">Аналитика.</strong>{' '}
            <Link href="/vacancies/analitika" className="text-accent hover:underline no-underline">
              Вакансии аналитика
            </Link>{' '}
            в digital почти всегда предполагают Google Таблицы и Яндекс.Метрику как минимум. Google
            Analytics, Semrush и сквозная аналитика — это уже мидл и выше.
          </p>

          <p>
            <strong className="text-text">Разработка и копирайтинг.</strong>{' '}
            <Link href="/vacancies/razrabotka" className="text-accent hover:underline no-underline">
              Вакансии разработчика
            </Link>{' '}
            в digital-агентствах нередко требуют Tilda и Figma — чтобы верстать лендинги и работать
            с макетами без лишних итераций с дизайнером.{' '}
            <Link
              href="/vacancies/copywriting"
              className="text-accent hover:underline no-underline"
            >
              Вакансии копирайтера
            </Link>{' '}
            всё чаще включают ChatGPT как рабочий инструмент ускорения — не замену автора, а
            помощника в структурировании и черновиках.
          </p>

          <h2 className="text-lg font-semibold text-text mt-6 mb-3">
            Как пользоваться страницей вакансий по навыкам
          </h2>

          <p>
            Выберите навык из сетки выше — и попадёте на страницу с вакансиями, где этот инструмент
            указан в требованиях. Если нужна более широкая выдача по специализации — смотрите{' '}
            <Link href="/vacancies" className="text-accent hover:underline no-underline">
              все вакансии
            </Link>{' '}
            с фильтрами по категории, формату занятости и грейду. Вакансии по навыкам и вакансии по
            специализации дополняют друг друга: первые помогают найти работу через конкретный
            инструмент, вторые — через профессию в целом.
          </p>

          <p>
            Если ищете работу в digital и знаете конкретный инструмент — начните с него. Вакансии по
            навыкам сужают выборку до предложений, где вы попадаете в требования работодателя с
            первого взгляда — без лишней фильтрации.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
