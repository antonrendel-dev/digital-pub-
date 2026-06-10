import { getPostsByTypePaginated } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import JsonLd from '@/components/JsonLd'
import type { Metadata } from 'next'

export const revalidate = 300

const BASE_URL = 'https://d-pub.ru'
const TITLE = 'Резюме дизайнеров, маркетологов и IT-специалистов'

const RESUMES_SEO_HTML = `<h2>База резюме digital-специалистов из Telegram</h2>
<p>Диджитал Паб агрегирует резюме специалистов digital-рынка из профильных Telegram-каналов. Здесь HR-менеджеры и руководители находят кандидатов на позиции в маркетинге, дизайне, SMM, аналитике и разработке. База пополняется ежедневно — свежие резюме появляются несколько раз в сутки.</p>
<h2>Резюме по специализациям</h2>
<ul>
<li><strong><a href="/resumes/tag/smm">SMM-специалисты</a></strong> — SMM-менеджеры, контент-менеджеры, специалисты по ведению социальных сетей.</li>
<li><strong><a href="/resumes/tag/marketing">Маркетологи</a></strong> — интернет-маркетологи, performance-специалисты, CRM и email-маркетологи.</li>
<li><strong><a href="/resumes/tag/dizajn">Дизайнеры</a></strong> — UI/UX, графические дизайнеры, веб-дизайнеры, моушн-дизайнеры.</li>
<li><strong><a href="/resumes/tag/copywriting">Копирайтеры</a></strong> — авторы текстов, редакторы, контент-стратеги для digital-проектов.</li>
<li><strong><a href="/resumes/tag/target">Таргетологи</a></strong> — специалисты по таргетированной и контекстной рекламе.</li>
<li><strong><a href="/resumes/tag/analitika">Аналитики</a></strong> — веб-аналитики, data-аналитики, продуктовые аналитики.</li>
<li><strong><a href="/resumes/tag/razrabotka">Разработчики</a></strong> — фронтенд, бэкенд и фулстек разработчики для digital-компаний.</li>
</ul>
<h2>Как найти кандидата</h2>
<p>Просматривай ленту резюме или переходи в нужную категорию через теги. Каждая карточка содержит описание опыта и навыков специалиста. Для связи с кандидатом перейдите в Telegram — все резюме публикуются из открытых профессиональных каналов.</p>`
const DESCRIPTION =
  'Резюме digital-специалистов: дизайнеры, маркетологи, SMM, аналитики. Найдите сотрудника из Telegram-сообщества для вашего проекта.'

interface Props {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const page = Math.min(Math.max(1, parseInt(pageParam || '1', 10) || 1), 500)
  const canonical = page === 1 ? `${BASE_URL}/resumes` : `${BASE_URL}/resumes?page=${page}`
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: TITLE,
      description:
        'Резюме digital-специалистов: дизайнеры, маркетологи, SMM, аналитики. Найдите сотрудника из Telegram-сообщества.',
      url: canonical,
      type: 'website',
    },
  }
}

export default async function ResumesPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams
  const page = Math.min(Math.max(1, parseInt(pageParam || '1', 10) || 1), 500)
  const [{ posts, total, totalPages }, tags, stats] = await Promise.all([
    getPostsByTypePaginated('resume', page, 20),
    getTagsWithCounts(),
    getStats(),
  ])

  const base = `${BASE_URL}/resumes`
  const prevUrl = page > 1 ? (page === 2 ? base : `${base}?page=${page - 1}`) : null
  const nextUrl = page < totalPages ? `${base}?page=${page + 1}` : null

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${BASE_URL}` },
      { '@type': 'ListItem', position: 2, name: 'Резюме', item: `${BASE_URL}/resumes` },
    ],
  }

  const collectionPageLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/resumes`,
    publisher: {
      '@type': 'Organization',
      name: 'Диджитал Паб',
      url: BASE_URL,
    },
  }

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={collectionPageLd} />
      {prevUrl && <link rel="prev" href={prevUrl} />}
      {nextUrl && <link rel="next" href={nextUrl} />}
      <ListingPage
        posts={posts}
        type="resume"
        tags={tags}
        stats={stats}
        currentPage={page}
        totalPages={totalPages}
        total={total}
        seoHtml={page === 1 ? RESUMES_SEO_HTML : undefined}
      />
    </>
  )
}
