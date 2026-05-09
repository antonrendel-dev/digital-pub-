import Link from 'next/link'

// Mapping from category slugs to article tag keywords for cross-linking
const CATEGORY_TO_ARTICLE_TAGS: Record<string, string[]> = {
  smm: ['SMM', 'smm'],
  seo: ['SEO', 'seo'],
  dizajn: ['дизайнер', 'дизайн', 'UI/UX', 'веб-дизайн', 'графический дизайн'],
  marketing: ['маркетолог', 'маркетинг', 'digital-маркетинг'],
  target: ['таргетолог', 'таргетированная реклама', 'таргет'],
  razrabotka: ['разработка', 'программирование', 'разработчик'],
  analitika: ['аналитика', 'веб-аналитика', 'аналитика данных'],
  hr: ['HR', 'hr', 'найм', 'рекрутинг'],
  udalyonka: ['удалённая работа', 'фриланс'],
  finansy: ['финансы'],
  wordpress: ['WordPress', 'wordpress'],
  junior: ['junior', 'стажёр'],
  middle: ['middle'],
  senior: ['senior'],
  menedzher: ['менеджер', 'проджект'],
  ofis: ['офис'],
  gibrid: ['гибрид'],
}

interface Article {
  title: string
  slug: string
  tags: string[]
}

/** Find articles related to a category by tag matching */
export function getRelatedArticlesForCategory(
  categorySlug: string,
  articles: Article[],
  limit: number = 3,
): Article[] {
  const keywords = CATEGORY_TO_ARTICLE_TAGS[categorySlug] || []
  if (keywords.length === 0) return articles.slice(0, limit)

  const scored = articles.map((a) => {
    const score = a.tags.reduce(
      (s, tag) =>
        s + (keywords.some((k) => tag.toLowerCase().includes(k.toLowerCase())) ? 1 : 0),
      0,
    )
    return { article: a, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.article)
}

/** Reverse: find categories related to an article by its tags */
export function getRelatedCategoriesForArticle(
  articleTags: string[],
): { slug: string; name: string }[] {
  const TAG_NAMES: Record<string, string> = {
    smm: 'SMM', seo: 'SEO', dizajn: 'Дизайн', marketing: 'Маркетинг',
    target: 'Таргет', razrabotka: 'Разработка', analitika: 'Аналитика',
    hr: 'HR', udalyonka: 'Удалёнка', finansy: 'Финансы',
    wordpress: 'WordPress', junior: 'Junior', middle: 'Middle',
    senior: 'Senior', menedzher: 'Менеджер', ofis: 'Офис', gibrid: 'Гибрид',
  }

  const matches: { slug: string; name: string; score: number }[] = []

  for (const [slug, keywords] of Object.entries(CATEGORY_TO_ARTICLE_TAGS)) {
    const score = articleTags.reduce(
      (s, tag) =>
        s + (keywords.some((k) => tag.toLowerCase().includes(k.toLowerCase())) ? 1 : 0),
      0,
    )
    if (score > 0) {
      matches.push({ slug, name: TAG_NAMES[slug] || slug, score })
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 4)
}

/** Component: show related articles on a category page */
export function RelatedArticlesBlock({
  articles,
}: {
  articles: { title: string; slug: string }[]
}) {
  if (articles.length === 0) return null

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="s-lbl mb-3">Полезные статьи</div>
      {articles.map((a) => (
        <Link
          key={a.slug}
          href={`/articles/${a.slug}`}
          className="block py-2.5 border-b border-border-light last:border-none last:pb-0 no-underline group"
        >
          <div className="text-[12.5px] text-text font-medium leading-snug group-hover:text-accent transition-colors">
            {a.title}
          </div>
        </Link>
      ))}
      <Link
        href="/articles"
        className="block mt-3 text-xs text-accent no-underline hover:underline"
      >
        Все статьи &rarr;
      </Link>
    </div>
  )
}

/** Component: show related categories on an article page */
export function RelatedCategoriesBlock({
  categories,
}: {
  categories: { slug: string; name: string }[]
}) {
  if (categories.length === 0) return null

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="s-lbl mb-3">Вакансии по теме</div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/vacancies/${c.slug}`}
            className="px-3 py-1.5 rounded-full text-xs border border-border bg-bg-card text-text-muted no-underline hover:border-accent hover:text-text transition-all"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
