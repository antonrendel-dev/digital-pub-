import Link from 'next/link'
import TagsSidebar, { TagData } from './TagsSidebar'

interface RightSidebarProps {
  tags?: TagData[]
  articles?: { title: string; slug: string; date: string }[]
}

export default function RightSidebar({ tags, articles }: RightSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Unified tags block */}
      {tags && tags.length > 0 && <TagsSidebar tags={tags} />}

      {/* Articles */}
      {articles && articles.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="s-lbl">Статьи</h3>
          <div className="space-y-3">
            {articles.map((article) => (
              <Link key={article.slug} href={`/articles/${article.slug}`} className="block group no-underline">
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
