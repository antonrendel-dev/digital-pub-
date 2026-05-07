import Link from 'next/link'

interface TagData {
  name: string
  slug: string
  tagType: string
  count: number
}

interface RightSidebarProps {
  tags?: TagData[]
  articles?: { title: string; slug: string; date: string }[]
}

const TAG_TYPE_LABELS: Record<string, { label: string; colorClass: string; order: number }> = {
  specialization: { label: 'Специализация', colorClass: 'tag-orange', order: 1 },
  format: { label: 'Формат работы', colorClass: 'tag-blue', order: 2 },
  level: { label: 'Уровень', colorClass: 'tag-green', order: 3 },
}

export default function RightSidebar({ tags, articles }: RightSidebarProps) {
  // Group tags by tagType
  const grouped = (tags ?? []).reduce<Record<string, TagData[]>>((acc, tag) => {
    if (!acc[tag.tagType]) acc[tag.tagType] = []
    acc[tag.tagType].push(tag)
    return acc
  }, {})

  const sortedGroups = Object.entries(grouped)
    .map(([type, items]) => ({
      type,
      label: TAG_TYPE_LABELS[type]?.label ?? type,
      colorClass: TAG_TYPE_LABELS[type]?.colorClass ?? 'tag-orange',
      order: TAG_TYPE_LABELS[type]?.order ?? 99,
      items: items.sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.order - b.order)

  // Categories = specialization tags with posts
  const categories = (tags ?? [])
    .filter(t => t.tagType === 'specialization' && t.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Tag cloud - grouped by type */}
      {sortedGroups.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="s-lbl">Популярные теги</h3>

          {sortedGroups.map((group) => (
            <div key={group.type} className="mb-3 last:mb-0">
              <div className="text-[9px] uppercase tracking-wide text-text-light font-medium mb-1">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/vacancies/${tag.slug}/`}
                    className={`${group.colorClass} px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition no-underline`}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="s-lbl">Категории</h3>
          <div className="space-y-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/vacancies/${cat.slug}/`}
                className="flex justify-between text-sm text-text-muted no-underline hover:text-text transition-colors"
              >
                <span>{cat.name}</span>
                <span className="text-text-light">{cat.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
