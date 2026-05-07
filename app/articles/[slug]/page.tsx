import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getArticleBySlug, getArticles, formatArticleDate } from '@/lib/articles'
import PageShell from '@/components/PageShell'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Статья не найдена' }

  return {
    title: `${article.title} — Диджитал Паб`,
    description: article.description,
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const allArticles = getArticles()
  const related = allArticles.filter((a) => a.slug !== article.slug).slice(0, 3)

  return (
    <PageShell>
      <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
          <Link href="/" className="text-text-muted no-underline hover:text-accent transition-colors">Главная</Link>
          <span className="text-text-light">&rsaquo;</span>
          <Link href="/articles" className="text-text-muted no-underline hover:text-accent transition-colors">Статьи</Link>
          <span className="text-text-light">&rsaquo;</span>
          <span className="text-text-light truncate">{article.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
          {/* Main */}
          <article className="bg-bg-card border border-border rounded-xl p-7 transition-colors duration-200">
            <h1 className="text-2xl font-bold text-text tracking-tight leading-snug mb-3">
              {article.title}
            </h1>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-text-light">{formatArticleDate(article.publishedAt)}</span>
              {article.tags.length > 0 && (
                <div className="flex gap-1">
                  {article.tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-border-light text-text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* MDX content with safe component allowlist */}
            <div className="prose prose-sm max-w-none text-text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_li]:text-sm [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-muted [&_blockquote]:my-4 [&_strong]:font-semibold [&_strong]:text-text [&_code]:bg-border-light [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm">
              {/* MDX is rendered without custom components prop -
                   only standard HTML elements are available.
                   MDX files are from our repo, not user-submitted.
                   See MDX_ALLOWED_ELEMENTS in lib/articles.ts for reference. */}
              <MDXRemote source={article.content} />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col gap-4">
            {related.length > 0 && (
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="s-lbl mb-3">Другие статьи</div>
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/articles/${r.slug}`}
                    className="block py-2.5 border-b border-border-light last:border-none last:pb-0 no-underline group"
                  >
                    <div className="text-[12.5px] text-text font-medium leading-snug mb-0.5 group-hover:text-accent transition-colors">
                      {r.title}
                    </div>
                    <div className="text-[11px] text-text-light">{formatArticleDate(r.publishedAt)}</div>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </PageShell>
  )
}
