import Link from 'next/link'
import type { Metadata } from 'next'
import PageShell from '@/components/PageShell'

export const metadata: Metadata = {
  title: 'Страница не найдена',
  description:
    'Запрашиваемая страница не найдена. Перейдите к вакансиям, резюме или статьям на Диджитал Паб.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl font-bold text-accent mb-4">404</div>
        <h1 className="text-2xl font-bold text-text mb-3">Страница не найдена</h1>
        <p className="text-text-muted mb-8">
          Возможно, вакансия была удалена или ссылка устарела. Попробуйте найти нужное через
          навигацию.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-gray-900 font-semibold text-sm rounded-full transition no-underline"
          >
            На главную
          </Link>
          <Link
            href="/vacancies"
            className="px-6 py-2.5 bg-bg-card border border-border hover:border-accent text-text font-medium text-sm rounded-full transition no-underline"
          >
            Вакансии
          </Link>
          <Link
            href="/resumes"
            className="px-6 py-2.5 bg-bg-card border border-border hover:border-accent text-text font-medium text-sm rounded-full transition no-underline"
          >
            Резюме
          </Link>
          <Link
            href="/articles"
            className="px-6 py-2.5 bg-bg-card border border-border hover:border-accent text-text font-medium text-sm rounded-full transition no-underline"
          >
            Статьи
          </Link>
        </div>

        <div className="mt-12 p-6 bg-bg-card border border-border rounded-xl">
          <div className="text-sm font-semibold text-text mb-2">Популярные категории</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['smm', 'seo', 'dizajn', 'marketing', 'razrabotka', 'analitika', 'target'].map(
              (slug) => (
                <Link
                  key={slug}
                  href={`/vacancies/${slug}`}
                  className="px-3 py-1.5 text-xs bg-border-light hover:bg-accent hover:text-gray-900 text-text-muted rounded-full transition no-underline"
                >
                  {slug}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
