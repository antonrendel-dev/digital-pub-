import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getTagBySlug, getPostsByTag, getTagsWithCounts } from '@/lib/tags'
import PageShell from '@/components/PageShell'
import JobCard from '@/components/feed/JobCard'
import JsonLd from '@/components/JsonLd'

interface Props {
  params: { tagSlug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tagSlug } = params
  const tag = await getTagBySlug(tagSlug)
  if (!tag) return { title: 'Тег не найден' }

  const title = `Резюме специалистов: ${tag.name}`
  const description = `Резюме ${tag.name}-специалистов из Telegram-сообщества. База кандидатов в digital-сфере на Диджитал Паб.`
  const url = `https://d-pub.ru/resumes/tag/${tagSlug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function TagPage({ params }: Props) {
  const { tagSlug } = params
  const tag = await getTagBySlug(tagSlug)
  if (!tag) notFound()

  const posts = (await getPostsByTag(tagSlug)).filter((p) => p.type === 'resume')
  const allTags = await getTagsWithCounts()
  const relatedTags = allTags.filter((t) => t.slug !== tagSlug && t.count > 0).slice(0, 8)

  // BreadcrumbList Schema.org
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://d-pub.ru' },
      { '@type': 'ListItem', position: 2, name: 'Резюме', item: 'https://d-pub.ru/resumes' },
      { '@type': 'ListItem', position: 3, name: tag.name },
    ],
  }

  return (
    <PageShell>
      <JsonLd data={breadcrumbLd} />
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
            <div
              className="prose prose-sm max-w-none text-text-muted [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-text [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_li]:text-sm [&_strong]:font-semibold [&_strong]:text-text"
              dangerouslySetInnerHTML={{ __html: tag.seoText }}
            />
          </div>
        )}
      </div>
    </PageShell>
  )
}
