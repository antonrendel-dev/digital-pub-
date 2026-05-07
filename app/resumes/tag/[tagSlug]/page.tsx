import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getTagBySlug, getPostsByTag, getTagsWithCounts } from '@/lib/tags'
import PageShell from '@/components/PageShell'
import JobCard from '@/components/feed/JobCard'

interface Props {
  params: Promise<{ tagSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tagSlug } = await params
  const tag = await getTagBySlug(tagSlug)
  if (!tag) return { title: 'Тег не найден' }

  return {
    title: tag.seoTitle?.replace('вакансии', 'резюме') ?? `${tag.name} — резюме | Диджитал Паб`,
    description: tag.seoDescription?.replace('Вакансии', 'Резюме') ?? `Резюме по тегу ${tag.name} на Диджитал Паб.`,
  }
}

export default async function TagPage({ params }: Props) {
  const { tagSlug } = await params
  const tag = await getTagBySlug(tagSlug)
  if (!tag) notFound()

  const posts = (await getPostsByTag(tagSlug)).filter((p) => p.type === 'resume')
  const allTags = await getTagsWithCounts()
  const relatedTags = allTags.filter((t) => t.slug !== tagSlug && t.count > 0).slice(0, 8)

  return (
    <PageShell>
      <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
          <Link href="/" className="text-text-muted no-underline hover:text-accent transition-colors">Главная</Link>
          <span className="text-text-light">&rsaquo;</span>
          <Link href="/resumes" className="text-text-muted no-underline hover:text-accent transition-colors">Резюме</Link>
          <span className="text-text-light">&rsaquo;</span>
          <span className="text-text-light">{tag.name}</span>
        </div>

        <h1 className="text-2xl font-bold text-text tracking-tight mb-2">
          Резюме: {tag.name}
        </h1>
        <p className="text-sm text-text-muted mb-6">
          {posts.length} резюме по тегу {tag.name}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div>
            {posts.length === 0 ? (
              <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
                Пока нет резюме с тегом {tag.name}
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <JobCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden lg:flex flex-col gap-4">
            {relatedTags.length > 0 && (
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="s-lbl mb-3">Связанные теги</div>
                <div className="flex flex-wrap gap-1.5">
                  {relatedTags.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/resumes/tag/${t.slug}`}
                      className="px-2.5 py-1 rounded text-xs border border-border bg-bg-card text-text-muted no-underline hover:border-accent hover:text-text transition-all"
                    >
                      {t.name} ({t.count})
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {tag.seoText && (
          <div className="mt-8 pt-6 border-t border-border-light">
            <p className="text-sm text-text-muted leading-relaxed">{tag.seoText}</p>
          </div>
        )}
      </div>
    </PageShell>
  )
}
