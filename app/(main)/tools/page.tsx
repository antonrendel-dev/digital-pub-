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

        <div className="mt-12 prose prose-sm max-w-none text-text-muted">
          <h2 className="text-lg font-semibold text-text mt-0">
            Какие навыки чаще всего требуют в digital-вакансиях
          </h2>
          <p>
            Рынок digital в 2026 году требует конкретных инструментов, а не размытого «опыта в
            маркетинге». Работодатели прямо пишут в текстах вакансий: Figma, Canva, ChatGPT, CapCut,
            Photoshop, Tilda, Яндекс.Метрика, Яндекс.Директ, Semrush, Screaming Frog, Midjourney,
            Google Analytics, Google Таблицы. Именно эти программы и стали основой страницы.
          </p>
          <p>
            Каждая карточка на этой странице — это навык или инструмент, который реально встречается
            в текстах вакансий digital-специалистов. Дизайнеры ищут работу с Figma или Photoshop,
            SMM-специалисты — с Canva и CapCut, маркетологи — с ChatGPT и Tilda, аналитики — с
            Метрикой и Google Analytics. Такая группировка показывает, где вы применимы прямо
            сейчас.
          </p>
          <h2 className="text-lg font-semibold text-text">Как найти вакансии под свои навыки</h2>
          <p>
            Механика простая: выбираете навык из сетки — страница показывает только те вакансии, где
            этот инструмент упомянут. Никакой ручной фильтрации по тексту объявления. Вакансии
            собираются из Telegram-каналов digital-тематики и обновляются регулярно.
          </p>
          <p>
            Примеры: по Figma находят вакансии UX/UI-дизайнеров и product-дизайнеров. По Canva и
            CapCut — позиции в SMM и контент-маркетинге. ChatGPT чаще всего фигурирует в требованиях
            к маркетологам и копирайтерам. Photoshop — у графических дизайнеров и арт-директоров.
            Tilda — у маркетологов и верстальщиков лендингов. Специализации охватывают SMM, дизайн,
            SEO, аналитику, маркетинг и разработку.
          </p>
          <p>
            Если ищете работу в digital и знаете конкретный инструмент — начните с него. Вакансии по
            навыкам сужают выборку до тех предложений, где вы действительно попадаете в требования
            работодателя.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
