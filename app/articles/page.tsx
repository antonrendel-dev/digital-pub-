import Link from 'next/link'
import type { Metadata } from 'next'
import { getArticles } from '@/lib/articles'
import PageShell from '@/components/PageShell'

export const metadata: Metadata = {
  title: 'Статьи — Диджитал Паб',
  description: 'Полезные статьи о карьере в digital: поиск работы, резюме, собеседования, зарплаты.',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ArticlesPage() {
  const articles = getArticles()

  return (
    <PageShell>
      <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
          <Link href="/" className="text-text-muted no-underline hover:text-accent transition-colors">Главная</Link>
          <span className="text-text-light">&rsaquo;</span>
          <span className="text-text-light">Статьи</span>
        </div>

        <h1 className="text-2xl font-bold text-text tracking-tight mb-6">Статьи</h1>

        {articles.length === 0 ? (
          <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
            Статьи скоро появятся
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="block bg-bg-card border border-border rounded-xl p-5 no-underline hover:border-text-light hover:shadow-md transition-all group"
              >
                <h2 className="text-base font-semibold text-text mb-2 leading-snug group-hover:text-accent transition-colors">
                  {article.title}
                </h2>
                <p className="text-sm text-text-muted line-clamp-3 mb-3">{article.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-light">{formatDate(article.publishedAt)}</span>
                  {article.tags.length > 0 && (
                    <div className="flex gap-1">
                      {article.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-border-light text-text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
