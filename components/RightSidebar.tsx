import Link from 'next/link'

interface RightSidebarProps {
  onTagClick: (tag: string) => void
}

const TAG_GROUPS = [
  {
    label: 'Специализация',
    colorClass: 'tag-orange',
    tags: ['SMM', 'SEO', 'Дизайнер', 'Маркетолог', 'Менеджер', 'Директ', 'Figma', 'Таргетолог', 'Контекстолог', 'Проджект'],
  },
  {
    label: 'Формат работы',
    colorClass: 'tag-blue',
    tags: ['Удалёнка', 'Офис', 'Гибрид', 'Фриланс'],
  },
  {
    label: 'Уровень',
    colorClass: 'tag-green',
    tags: ['Junior', 'Middle', 'Senior'],
  },
]

const CATEGORIES = [
  { name: 'SMM и маркетинг', count: 10 },
  { name: 'Дизайн', count: 3 },
  { name: 'SEO', count: 3 },
  { name: 'Менеджмент', count: 2 },
  { name: 'Разработка', count: 2 },
  { name: 'Таргет и реклама', count: 2 },
]

const ARTICLES = [
  { title: 'Как пройти техническое собеседование в 2025 году', date: '3 дня назад' },
  { title: 'Резюме на одну страницу: за и против', date: '5 дней назад' },
  { title: 'Зарплатные ожидания: как не продешевить', date: '1 неделю назад' },
]

export default function RightSidebar({ onTagClick }: RightSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Tag cloud - grouped by type */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <h3 className="s-lbl">Популярные теги</h3>

        {TAG_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <div className="text-[9px] uppercase tracking-wide text-text-light font-medium mb-1">
              {group.label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map((tag) => (
                <button
                  key={tag}
                  className={`${group.colorClass} px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition cursor-pointer border-none`}
                  onClick={() => onTagClick(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <h3 className="s-lbl">Категории</h3>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.name}
              href="#"
              className="flex justify-between text-sm text-text-muted no-underline hover:text-text transition-colors"
            >
              <span>{cat.name}</span>
              <span className="text-text-light">{cat.count}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <h3 className="s-lbl">Статьи</h3>
        <div className="space-y-3">
          {ARTICLES.map((article) => (
            <Link key={article.title} href="/articles" className="block group no-underline">
              <div className="text-sm text-text-muted group-hover:text-text font-medium transition-colors">
                {article.title}
              </div>
              <div className="text-xs text-text-light mt-0.5">{article.date}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
