import Link from 'next/link'

export interface TagData {
  name: string
  slug: string
  tagType: string
  count: number
}

const TAG_TYPE_LABELS: Record<string, { label: string; colorClass: string; order: number }> = {
  specialization: { label: 'Категории', colorClass: 'tag-orange', order: 1 },
  format: { label: 'Формат работы', colorClass: 'tag-blue', order: 2 },
  level: { label: 'Уровень', colorClass: 'tag-green', order: 3 },
}

interface TagsSidebarProps {
  tags: TagData[]
  /** Currently active tag slug — will be visually highlighted */
  activeSlug?: string
  heading?: string
  /** Override link target. Defaults to /vacancies/[slug] */
  hrefFn?: (slug: string) => string
}

export default function TagsSidebar({
  tags,
  activeSlug,
  heading = 'Категории и теги',
  hrefFn,
}: TagsSidebarProps) {
  const grouped = tags
    .filter((t) => t.count > 0)
    .reduce<Record<string, TagData[]>>((acc, tag) => {
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
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.order - b.order)

  if (sortedGroups.length === 0) return null

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h3 className="s-lbl">{heading}</h3>

      {sortedGroups.map((group) => (
        <div key={group.type} className="mb-3 last:mb-0">
          <div className="text-[9px] uppercase tracking-wide text-text-light font-medium mb-1.5">
            {group.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((tag) => {
              const isActive = tag.slug === activeSlug
              return (
                <Link
                  key={tag.slug}
                  href={hrefFn ? hrefFn(tag.slug) : `/vacancies/${tag.slug}`}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium no-underline transition ${
                    isActive ? 'ring-2 ring-accent opacity-100' : 'hover:opacity-80'
                  } ${group.colorClass}`}
                >
                  {tag.name}
                  <span className="ml-1 opacity-60">{tag.count}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
