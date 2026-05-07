import Link from 'next/link'
import type { Metadata } from 'next'
import { getArticles, formatArticleDate } from '@/lib/articles'
import PageShell from '@/components/PageShell'

export const metadata: Metadata = {
  title: 'Статьи о работе в digital — Диджитал Паб',
  description: 'Полезные статьи для фрилансеров и digital-специалистов: карьера, резюме, собеседования, зарплаты.',
}

export default function ArticlesPage() {
  const articles = getArticles()

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Статьи</h1>
        <p className="text-text-muted mb-8">Полезные материалы для фрилансеров и digital-специалистов</p>

        {articles.length === 0 ? (
          <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
            Статьи скоро появятся
          </div>
        ) : (
          <div className="space-y-5">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="block bg-bg-card border border-border rounded-xl p-6 no-underline hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-full md:w-48 h-32 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex-shrink-0 flex items-center justify-center text-blue-300 text-xs" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {article.tags.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                          {article.tags[0]}
                        </span>
                      )}
                      <span className="text-xs text-text-light">{formatArticleDate(article.publishedAt)}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-text mb-2">{article.title}</h2>
                    <p className="text-sm text-text-muted line-clamp-2">{article.description}</p>
                    <div className="mt-3 text-sm text-amber-600 font-medium">Читать &rarr;</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
