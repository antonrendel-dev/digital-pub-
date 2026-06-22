import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPostsByTool } from '@/lib/posts'
import PageShell from '@/components/PageShell'
import VacancyGrid from '@/components/VacancyGrid'
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
]

export function generateStaticParams() {
  return TOOLS.map((t) => ({ toolSlug: t.slug }))
}

interface Props {
  params: Promise<{ toolSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { toolSlug } = await params
  const tool = TOOLS.find((t) => t.slug === toolSlug)
  if (!tool) return { title: 'Инструмент не найден' }

  const title = `Вакансии ${tool.name} — работа со знанием ${tool.name} | Диджитал Паб`
  const description = `Актуальные вакансии где требуется ${tool.name}. Собраны из Telegram-каналов digital-рынка. Обновляется каждый день.`
  const canonical = `${BASE_URL}/tools/${tool.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
  }
}

export default async function ToolPage({ params }: Props) {
  const { toolSlug } = await params
  const tool = TOOLS.find((t) => t.slug === toolSlug)
  if (!tool) notFound()

  const { posts, total } = await getPostsByTool(tool.query)

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Инструменты', item: `${BASE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: tool.name, item: `${BASE_URL}/tools/${tool.slug}` },
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
          <Link href="/tools" className="no-underline hover:text-text transition-colors">
            Инструменты
          </Link>
          <span>&#8250;</span>
          <span className="text-text">{tool.name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">
          Вакансии со знанием {tool.name}
        </h1>
        <p className="text-text-muted mb-6">
          Актуальные вакансии, где требуется {tool.name} — собраны из Telegram-каналов digital-рынка
        </p>

        {/* Count */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm">
            <span className="text-text-muted">Найдено вакансий:</span>
            <strong className="text-text">{total}</strong>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
            Пока нет вакансий с упоминанием {tool.name}
          </div>
        ) : (
          <VacancyGrid posts={posts} />
        )}

        {/* SEO text placeholder */}
        <article className="mt-12 pt-8 border-t border-border prose prose-sm max-w-none text-text-muted">
          <h2 className="text-lg font-bold text-text mb-3">
            Работа с {tool.name} — что важно знать
          </h2>
          <p>
            {tool.name} — один из популярных инструментов digital-специалистов. Вакансии, где
            требуется знание {tool.name}, регулярно появляются в Telegram-каналах по маркетингу,
            дизайну и IT. На Диджитал Паб мы агрегируем эти предложения в одном месте — база
            обновляется каждый день.
          </p>
        </article>
      </div>
    </PageShell>
  )
}
