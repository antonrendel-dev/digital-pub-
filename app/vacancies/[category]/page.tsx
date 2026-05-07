import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getTagBySlug, getPostsByTag, getTagsWithCounts } from '@/lib/tags'
import PageShell from '@/components/PageShell'
import TileCard from '@/components/feed/TileCard'
import TagsSidebar from '@/components/TagsSidebar'

interface Props {
  params: { category: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = params
  const tag = await getTagBySlug(category)
  if (!tag) return { title: 'Категория не найдена' }

  return {
    title: tag.seoTitle ?? `${tag.name} — вакансии | Диджитал Паб`,
    description: tag.seoDescription ?? `Вакансии по категории ${tag.name} на Диджитал Паб.`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = params
  const tag = await getTagBySlug(category)
  if (!tag) notFound()

  const posts = (await getPostsByTag(category)).filter((p) => p.type === 'vacancy')
  const allTags = await getTagsWithCounts()

  return (
    <PageShell>
      <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="no-underline hover:text-text transition-colors">Главная</Link>
          <span>&#8250;</span>
          <Link href="/vacancies" className="no-underline hover:text-text transition-colors">Вакансии</Link>
          <span>&#8250;</span>
          <span className="text-text">{tag.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* Content */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">
              {tag.name}-вакансии
            </h1>
            <p className="text-text-muted mb-6">
              Актуальные вакансии в сфере {tag.name}: удалённая работа, фриланс, полная занятость
            </p>

            {/* Count */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm text-text-muted">
                Найдено <strong className="text-text">{posts.length}</strong> вакансий
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
                Пока нет вакансий в категории {tag.name}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <TileCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {/* Load more placeholder */}
            {posts.length > 20 && (
              <div className="mt-6 text-center">
                <button className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-full cursor-pointer transition border-none">
                  Показать ещё
                </button>
              </div>
            )}

            {/* SEO text */}
            {tag.seoText && (
              <article className="mt-12 pt-8 border-t border-border">
                <h2 className="text-xl font-bold text-text mb-4">Работа в {tag.name}</h2>
                <div className="prose prose-sm text-text-muted space-y-3">
                  <p>{tag.seoText}</p>
                </div>
              </article>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-6">
            <TagsSidebar tags={allTags} activeSlug={category} />

            {/* CTA */}
            <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 text-center">
              <div className="text-sm font-semibold text-text mb-2">Ищете {tag.name}-специалиста?</div>
              <p className="text-xs text-text-muted mb-3">Разместите вакансию через нашего бота и получите отклики из сообщества</p>
              <a
                href="https://t.me/resume_vac_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-accent hover:bg-accent-hover text-gray-900 font-semibold text-sm px-4 py-2 rounded-full transition no-underline"
              >
                Разместить вакансию
              </a>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  )
}
