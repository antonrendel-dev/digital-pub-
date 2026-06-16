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
    <div className="my-8 rounded-xl border border-accent/20 bg-accent/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-accent/10">
        <span className="text-sm font-semibold text-accent">
          Актуальные вакансии: {categoryName}
        </span>
        <Link
          href={`/vacancies/${categorySlug}`}
          className="text-xs text-accent hover:underline no-underline"
        >
          Все вакансии &rarr;
        </Link>
      </div>

      {/* Vacancy list */}
      {vacancies.map((vacancy) => {
        const href =
          vacancy.slug
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
            className="flex flex-col gap-0.5 px-5 py-3 border-t border-accent/10 hover:bg-accent/5 transition-colors no-underline"
          >
            <span className="text-sm font-medium text-text">{vacancy.title}</span>
            {meta && <span className="text-xs text-text-muted">{meta}</span>}
            {firstSentence && (
              <span className="text-xs text-text-light line-clamp-1">{firstSentence}</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
