import Link from 'next/link'
import TagsSidebar, { TagData } from './TagsSidebar'

const RESUME_TAGS = [
  { slug: 'smm', name: 'SMM-специалисты' },
  { slug: 'marketing', name: 'Маркетологи' },
  { slug: 'dizajn', name: 'Дизайнеры' },
  { slug: 'seo', name: 'SEO' },
  { slug: 'target', name: 'Таргетологи' },
  { slug: 'copywriting', name: 'Копирайтеры' },
  { slug: 'analitika', name: 'Аналитики' },
  { slug: 'razrabotka', name: 'Разработчики' },
  { slug: 'hr', name: 'HR' },
]

interface RightSidebarProps {
  tags?: TagData[]
  articles?: { title: string; slug: string; date: string }[]
}

export default function RightSidebar({ tags, articles }: RightSidebarProps) {
  return (
    <div className="space-y-4">
      {tags && tags.length > 0 && <TagsSidebar tags={tags} heading="Вакансии" />}

      <div className="bg-bg-card border border-border rounded-xl p-4">
        <h3 className="s-lbl">Резюме</h3>
        <div className="flex flex-wrap gap-1.5">
          {RESUME_TAGS.map((item) => (
            <Link
              key={item.slug}
              href={`/resumes/tag/${item.slug}`}
              className="px-2.5 py-1 rounded-full text-xs font-medium no-underline transition hover:opacity-80 tag-orange"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {articles && articles.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="s-lbl">Статьи</h3>
          <div className="space-y-3">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="block group no-underline"
              >
                <div className="text-sm text-text-muted group-hover:text-text font-medium transition-colors">
                  {article.title}
                </div>
                <div className="text-xs text-text-light mt-0.5">{article.date}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
