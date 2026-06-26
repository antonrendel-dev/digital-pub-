import Link from 'next/link'

// Spec→spec internal cross-links (for category pages)
const RELATED_SPEC_CATEGORIES: Record<string, string[]> = {
  smm: ['content', 'marketing', 'target'],
  seo: ['marketing', 'razrabotka', 'analitika'],
  dizajn: ['razrabotka', 'marketing', 'content'],
  marketing: ['smm', 'target', 'content'],
  menedzher: ['marketing', 'analitika', 'razrabotka'],
  target: ['smm', 'marketing', 'seo'],
  razrabotka: ['seo', 'analitika', 'dizajn'],
  analitika: ['seo', 'marketing', 'razrabotka'],
  finansy: ['analitika', 'menedzher'],
  kreativ: ['smm', 'content', 'dizajn'],
  copywriting: ['content', 'smm', 'marketing'],
  content: ['smm', 'copywriting', 'marketing'],
}

const SPEC_TAG_NAMES: Record<string, string> = {
  smm: 'SMM',
  seo: 'SEO',
  dizajn: 'Дизайн',
  marketing: 'Маркетинг',
  menedzher: 'Менеджер',
  target: 'Таргет',
  razrabotka: 'Разработка',
  analitika: 'Аналитика',
  finansy: 'Финансы',
  kreativ: 'Креатив',
  copywriting: 'Копирайтинг',
  content: 'Контент',
}

export function getRelatedSpecCategories(slug: string): { slug: string; name: string }[] {
  return (RELATED_SPEC_CATEGORIES[slug] ?? []).map((s) => ({
    slug: s,
    name: SPEC_TAG_NAMES[s] ?? s,
  }))
}

export function RelatedSpecCategoriesBlock({
  categories,
}: {
  categories: { slug: string; name: string }[]
}) {
  if (categories.length === 0) return null
  return (
    <section className="mt-10 pt-8 border-t border-border">
      <h2 className="text-base font-semibold text-text mb-4">Смотрите также</h2>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/vacancies/${c.slug}`}
            className="px-4 py-2 rounded-full text-sm border border-border bg-bg-card text-text-muted no-underline hover:border-accent hover:text-text transition-all"
          >
            {c.name} вакансии
          </Link>
        ))}
      </div>
    </section>
  )
}

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
  limit: number = 3
): Article[] {
  const keywords = CATEGORY_TO_ARTICLE_TAGS[categorySlug] || []
  if (keywords.length === 0) return articles.slice(0, limit)

  const scored = articles.map((a) => {
    const score = a.tags.reduce(
      (s, tag) => s + (keywords.some((k) => tag.toLowerCase().includes(k.toLowerCase())) ? 1 : 0),
      0
    )
    return { article: a, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.article)
}

const TAG_NAMES: Record<string, string> = {
  smm: 'SMM',
  seo: 'SEO',
  dizajn: 'Дизайн',
  marketing: 'Маркетинг',
  target: 'Таргет',
  razrabotka: 'Разработка',
  analitika: 'Аналитика',
  hr: 'HR',
  udalyonka: 'Удалёнка',
  finansy: 'Финансы',
  wordpress: 'WordPress',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  menedzher: 'Менеджер',
  ofis: 'Офис',
  gibrid: 'Гибрид',
  copywriting: 'Копирайтинг',
  content: 'Контент',
}

/** Reverse: find categories related to an article by its tags */
export function getRelatedCategoriesForArticle(
  articleTags: string[]
): { slug: string; name: string }[] {
  const matches: { slug: string; name: string; score: number }[] = []

  for (const [slug, keywords] of Object.entries(CATEGORY_TO_ARTICLE_TAGS)) {
    const score = articleTags.reduce(
      (s, tag) => s + (keywords.some((k) => tag.toLowerCase().includes(k.toLowerCase())) ? 1 : 0),
      0
    )
    if (score > 0) {
      matches.push({ slug, name: TAG_NAMES[slug] || slug, score })
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 4)
}

// Keyword matching by article title for Payload articles without tags
const TITLE_KEYWORDS: Record<string, string[]> = {
  smm: ['smm'],
  seo: ['seo'],
  dizajn: ['дизайн', 'дизайнер', 'ui/ux'],
  marketing: ['маркетинг', 'маркетолог'],
  target: ['таргет', 'таргетолог'],
  razrabotka: ['разработка', 'разработчик'],
  analitika: ['аналитик', 'аналитика'],
  hr: ['hr', 'рекрутинг', 'найм'],
  copywriting: ['копирайтинг', 'копирайтер'],
  content: ['контент-менеджер', 'контент-маркетолог'],
  menedzher: ['менеджер проекта', 'проджект'],
}

/**
 * Find related categories by tags first, then fall back to title keyword matching.
 * Used for Payload articles which may not have tags set.
 */
export function getRelatedCategoriesForTitleAndTags(
  title: string,
  tags?: string[]
): { slug: string; name: string }[] {
  // Try tag-based matching first
  if (tags && tags.length > 0) {
    const fromTags = getRelatedCategoriesForArticle(tags)
    if (fromTags.length > 0) return fromTags
  }

  // Fallback: keyword matching on title
  const titleLower = title.toLowerCase()
  const matches: { slug: string; name: string }[] = []

  for (const [slug, keywords] of Object.entries(TITLE_KEYWORDS)) {
    if (keywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
      matches.push({ slug, name: TAG_NAMES[slug] || slug })
      if (matches.length >= 4) break
    }
  }

  return matches
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

// Tool slug → display name
const TOOL_NAMES: Record<string, string> = {
  figma: 'Figma',
  canva: 'Canva',
  photoshop: 'Photoshop',
  midjourney: 'Midjourney',
  chatgpt: 'ChatGPT',
  capcut: 'CapCut',
  'yandex-metrika': 'Яндекс.Метрика',
  'google-analytics': 'Google Analytics',
  'yandex-direct': 'Яндекс.Директ',
  semrush: 'SEMrush',
  'screaming-frog': 'Screaming Frog',
  tilda: 'Tilda',
}

// Keyword → tool slugs mapping
const KEYWORD_TO_TOOLS: { keywords: string[]; tools: string[] }[] = [
  { keywords: ['smm', 'контент', 'reels', 'видео', 'монтаж'], tools: ['capcut', 'canva'] },
  {
    keywords: ['дизайн', 'дизайнер', 'ui/ux', 'интерфейс', 'figma'],
    tools: ['figma', 'canva', 'photoshop'],
  },
  {
    keywords: ['seo', 'семантика', 'позиции', 'аудит сайта'],
    tools: ['semrush', 'screaming-frog', 'yandex-metrika'],
  },
  {
    keywords: ['аналитик', 'аналитика', 'метрика', 'трафик'],
    tools: ['google-analytics', 'yandex-metrika'],
  },
  {
    keywords: ['маркетолог', 'маркетинг', 'контекст', 'реклама', 'таргет'],
    tools: ['yandex-direct', 'google-analytics'],
  },
  {
    keywords: ['нейросет', 'ai', 'ии', 'искусственный интеллект', 'генерация'],
    tools: ['chatgpt', 'midjourney'],
  },
  { keywords: ['лендинг', 'сайт', 'tilda', 'тильда', 'no-code'], tools: ['tilda'] },
  { keywords: ['photoshop', 'фотошоп', 'ретушь'], tools: ['photoshop'] },
  { keywords: ['midjourney'], tools: ['midjourney'] },
  { keywords: ['chatgpt', 'openai', 'gpt'], tools: ['chatgpt'] },
  { keywords: ['capcut', 'кап кут'], tools: ['capcut'] },
]

export function getRelatedToolsForArticle(
  title: string,
  tags?: string[]
): { slug: string; name: string }[] {
  const haystack = [title, ...(tags ?? [])].join(' ').toLowerCase()
  const found = new Set<string>()

  for (const { keywords, tools } of KEYWORD_TO_TOOLS) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      tools.forEach((t) => found.add(t))
    }
  }

  return Array.from(found)
    .slice(0, 4)
    .map((slug) => ({ slug, name: TOOL_NAMES[slug] ?? slug }))
}

/** Component: show related tool pages on an article page */
export function RelatedToolsBlock({ tools }: { tools: { slug: string; name: string }[] }) {
  if (tools.length === 0) return null

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="s-lbl mb-3">Инструменты по теме</div>
      <div className="flex flex-wrap gap-1.5">
        {tools.map((t) => (
          <Link
            key={t.slug}
            href={`/tools/${t.slug}`}
            className="px-3 py-1.5 rounded-full text-xs border border-border bg-bg-card text-text-muted no-underline hover:border-accent hover:text-text transition-all"
          >
            {t.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
