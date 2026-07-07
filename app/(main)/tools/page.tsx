import type { Metadata } from 'next'
import Link from 'next/link'
import { getPostsByTool } from '@/lib/posts'
import PageShell from '@/components/PageShell'
import JsonLd from '@/components/JsonLd'

export const revalidate = 300

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
  title: 'Вакансии по инструментам — digital-специалисты | Диджитал Паб',
  description:
    'Вакансии для digital-специалистов по инструментам: Figma, CapCut, ChatGPT, Canva, Photoshop, Tilda и другие. Собраны из Telegram-каналов.',
  alternates: { canonical: `${BASE_URL}/tools` },
  openGraph: {
    title: 'Вакансии по инструментам — digital-специалисты | Диджитал Паб',
    description:
      'Вакансии для digital-специалистов по инструментам: Figma, CapCut, ChatGPT, Canva и другие.',
    url: `${BASE_URL}/tools`,
    type: 'website',
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
      { '@type': 'ListItem', position: 2, name: 'Инструменты', item: `${BASE_URL}/tools` },
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
          <span className="text-text">Инструменты</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Вакансии по инструментам</h1>
        <p className="text-text-muted mb-8">
          Вакансии digital-специалистов, сгруппированные по инструментам и программам
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
      </div>
    </PageShell>
  )
}
