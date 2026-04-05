import { CLOUD_TAGS } from '@/lib/data'

interface RightSidebarProps {
  onTagClick: (tag: string) => void
}

const CATEGORIES = [
  { name: 'Разработка', count: 94 },
  { name: 'Маркетинг', count: 41 },
  { name: 'Дизайн', count: 37 },
  { name: 'Продажи', count: 31 },
  { name: 'Аналитика', count: 28 },
  { name: 'Финансы', count: 22 },
  { name: 'HR', count: 18 },
]

const ARTICLES = [
  { title: 'Как пройти техническое собеседование в 2025 году', date: '3 дня назад' },
  { title: 'Резюме на одну страницу: за и против', date: '5 дней назад' },
  { title: 'Зарплатные ожидания: как не продешевить', date: '1 неделю назад' },
]

export default function RightSidebar({ onTagClick }: RightSidebarProps) {
  return (
    <div className="right-col">
      <div className="s-sec">
        <div className="s-lbl">Популярные теги</div>
        <div className="tag-cloud">
          {CLOUD_TAGS.map((tag) => (
            <button key={tag.t} className={`ctag ${tag.s}`} onClick={() => onTagClick(tag.t)}>
              {tag.t}
            </button>
          ))}
        </div>
      </div>

      <div className="s-sec">
        <div className="s-lbl">Категории</div>
        {CATEGORIES.map((cat) => (
          <a key={cat.name} href="#" className="cat-link">
            {cat.name} <span>{cat.count}</span>
          </a>
        ))}
      </div>

      <div className="s-sec">
        <div className="s-lbl">Статьи</div>
        {ARTICLES.map((article) => (
          <div key={article.title} className="art-item">
            <a href="#">{article.title}</a>
            <div className="dt">{article.date}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
