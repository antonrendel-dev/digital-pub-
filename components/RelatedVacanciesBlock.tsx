import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

// Mapping from article category slug to vacancy tag slug
const ARTICLE_CATEGORY_TO_TAG_SLUG: Record<string, string> = {
  smm: 'smm',
  seo: 'seo',
  dizajn: 'dizajn',
  marketing: 'marketing',
  target: 'target',
  razrabotka: 'razrabotka',
  analitika: 'analitika',
  hr: 'hr',
  copywriting: 'copywriting',
  content: 'content',
  menedzher: 'menedzher',
}

interface VacancyPreview {
  id: number
  title: string
  slug: string | null
  company: string | null
  salary: string | null
  description: string | null
}

async function getVacanciesForCategory(
  categorySlug: string
): Promise<{ vacancies: VacancyPreview[]; categoryName: string } | null> {
  const tagSlug = ARTICLE_CATEGORY_TO_TAG_SLUG[categorySlug]
  if (!tagSlug) return null

  try {
    const payload = await getPayload({ config })

    // Find the tag first to get its ID and name
    const tagResult = await payload.find({
      collection: 'tags',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { slug: { equals: tagSlug }, tagType: { equals: 'specialization' } } as any,
      limit: 1,
    })
    if (!tagResult.docs.length) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tag = tagResult.docs[0] as any
    const tagId = tag.id
    const categoryName: string = tag.name

    // Fetch 3 latest published vacancies with this tag
    const postsResult = await payload.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
        type: { equals: 'vacancy' },
        description: { not_equals: null },
        tags: { in: [tagId] },
      },
      limit: 3,
      sort: '-createdAt',
    })

    if (!postsResult.docs.length) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vacancies: VacancyPreview[] = (postsResult.docs as any[]).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug ?? null,
      company: p.company ?? null,
      salary: p.salary ?? null,
      description: p.description ?? null,
    }))

    return { vacancies, categoryName }
  } catch {
    return null
  }
}

interface Props {
  categories: { slug: string; name: string }[]
}

export default async function RelatedVacanciesBlock({ categories }: Props) {
  // Find first category that has a mapping
  const matchedCategory = categories.find((c) => ARTICLE_CATEGORY_TO_TAG_SLUG[c.slug])
  if (!matchedCategory) return null

  const data = await getVacanciesForCategory(matchedCategory.slug)
  if (!data || data.vacancies.length === 0) return null

  const { vacancies, categoryName } = data
  const categorySlug = matchedCategory.slug

  return (
    <div className="my-8 rounded-xl overflow-hidden border border-amber-200 dark:border-amber-700/40 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            className="shrink-0 text-amber-400"
          >
            <path
              d="M5.5 2a.5.5 0 0 0-.5.5V4H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2V2.5a.5.5 0 0 0-.5-.5h-4ZM6 4V3h3v1H6Zm-3 1h9v7H3V5Z"
              fill="currentColor"
            />
          </svg>
          <span className="text-sm font-bold text-white tracking-tight">
            Актуальные вакансии — {categoryName}
          </span>
        </div>
        <Link
          href={`/vacancies/${categorySlug}`}
          className="text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline no-underline whitespace-nowrap transition-colors"
        >
          Смотреть все &rarr;
        </Link>
      </div>

      {/* Vacancy list */}
      <div className="bg-amber-50 dark:bg-amber-950/30 divide-y divide-amber-100 dark:divide-amber-800/30">
        {vacancies.map((vacancy) => {
          const href = vacancy.slug
            ? `/vacancies/${categorySlug}/${vacancy.slug}`
            : `/post/${vacancy.id}`

          const firstSentence = vacancy.description
            ? vacancy.description.split(/[.!?]/)[0].trim()
            : null

          const meta = [vacancy.company, vacancy.salary].filter(Boolean).join(' • ')

          return (
            <Link
              key={vacancy.id}
              href={href}
              className="flex flex-col gap-0.5 px-5 py-3.5 hover:bg-amber-100/70 dark:hover:bg-amber-900/20 transition-colors no-underline group"
            >
              <span className="text-sm font-semibold text-text group-hover:text-accent transition-colors">
                {vacancy.title}
              </span>
              {meta && <span className="text-xs text-text-muted">{meta}</span>}
              {firstSentence && (
                <span className="text-xs text-text-light line-clamp-1">{firstSentence}</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
