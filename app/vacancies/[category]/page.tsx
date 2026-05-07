import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getTagBySlug, getPostsByTag, getTagsWithCounts } from '@/lib/tags'
import PageShell from '@/components/PageShell'
import JobCard from '@/components/feed/JobCard'

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
  const relatedTags = allTags.filter((t) => t.slug !== category && t.count > 0).slice(0, 8)

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
              Актуальные вакансии по категории {tag.name}
            </p>

            {/* Count */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-text-muted">
                Найдено <strong className="text-text">{posts.length}</strong> вакансий
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
                Пока нет вакансий в категории {tag.name}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <JobCard key={post.id} post={post} />
                ))}
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
            {/* Related tags */}
            {relatedTags.length > 0 && (
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text-muted mb-3">Похожие теги</h3>
                <div className="flex flex-wrap gap-1.5">
                  {relatedTags.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/vacancies/${t.slug}/`}
                      className="tag-orange px-2.5 py-1 rounded-full text-xs font-medium no-underline hover:opacity-80 transition"
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

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
