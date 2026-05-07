import { CLOUD_TAGS } from '@/lib/data'

interface RightSidebarProps {
  onTagClick: (tag: string) => void
}

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
      {/* Tag cloud */}
      <div>
        <h3 className="s-lbl">Популярные теги</h3>
        <div className="flex flex-wrap gap-1">
          {CLOUD_TAGS.map((tag) => (
            <button
              key={tag.t}
              className={`px-2.5 py-1 rounded border border-border bg-bg-card text-text-muted cursor-pointer transition-all hover:border-accent hover:text-text ${
                tag.s === 'lg' ? 'text-[13px]' : tag.s === 'sm' ? 'text-[10px]' : 'text-[11px]'
              }`}
              onClick={() => onTagClick(tag.t)}
            >
              {tag.t}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="s-lbl">Категории</h3>
        <div className="space-y-0">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.name}
              href="#"
              className="flex justify-between items-center py-1.5 border-b border-border-light text-sm text-text-muted no-underline hover:text-accent transition-colors"
            >
              <span>{cat.name}</span>
              <span className="text-[11px] text-text-light">{cat.count}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div>
        <h3 className="s-lbl">Статьи</h3>
        <div className="space-y-0">
          {ARTICLES.map((article) => (
            <div key={article.title} className="py-2 border-b border-border-light">
              <a href="#" className="text-[11.5px] text-text-muted no-underline leading-snug block hover:text-accent transition-colors">
                {article.title}
              </a>
              <div className="text-[10px] text-text-light mt-0.5">{article.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
