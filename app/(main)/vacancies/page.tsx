import { getPostsByTypePaginated } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import JsonLd from '@/components/JsonLd'
import type { Metadata } from 'next'

export const revalidate = 300

const BASE_URL = 'https://d-pub.ru'
const TITLE = 'Вакансии маркетолога, дизайнера, SMM, аналитика'

const VACANCIES_SEO_HTML = `<h2>Вакансии для digital-специалистов — маркетинг, дизайн, SMM, IT</h2>
<p>На Диджитал Паб собраны актуальные вакансии из профильных Telegram-каналов digital-рынка. База обновляется автоматически несколько раз в день — вы всегда видите свежие предложения от агентств, стартапов и крупных компаний. Здесь работу ищут маркетологи, дизайнеры, SMM-менеджеры, таргетологи, аналитики, разработчики и контент-мейкеры.</p>
<h2>Фильтруй вакансии по специализации</h2>
<ul>
<li><strong><a href="/vacancies/smm">SMM-вакансии</a></strong> — SMM-менеджер, контент-менеджер, специалист по продвижению в социальных сетях.</li>
<li><strong><a href="/vacancies/marketing">Маркетинг</a></strong> — интернет-маркетолог, performance-маркетолог, CRM-маркетолог, email-маркетолог.</li>
<li><strong><a href="/vacancies/dizajn">Дизайн</a></strong> — UI/UX-дизайнер, графический дизайнер, веб-дизайнер, моушн-дизайнер.</li>
<li><strong><a href="/vacancies/copywriting">Копирайтинг</a></strong> — копирайтер, редактор, автор текстов, контент-стратег.</li>
<li><strong><a href="/vacancies/target">Таргет</a></strong> — таргетолог ВКонтакте, специалист по Яндекс Директ, PPC-менеджер.</li>
<li><strong><a href="/vacancies/seo">SEO</a></strong> — SEO-специалист, линкбилдер, специалист по техническому SEO.</li>
<li><strong><a href="/vacancies/analitika">Аналитика</a></strong> — веб-аналитик, продуктовый аналитик, data-аналитик.</li>
<li><strong><a href="/vacancies/razrabotka">Разработка</a></strong> — фронтенд, бэкенд, фулстек разработчики для digital-продуктов.</li>
</ul>
<h2>Удалённая работа и офис</h2>
<p>Большинство вакансий в digital допускают удалённый формат. Используй фильтр по формату занятости: <a href="/vacancies/udalyonka">удалёнка</a>, <a href="/vacancies/ofis">офис</a> или <a href="/vacancies/gibrid">гибрид</a>. Все вакансии размечены по грейду: <a href="/vacancies/junior">junior</a>, <a href="/vacancies/middle">middle</a>, <a href="/vacancies/senior">senior</a> — находи предложения точно под свой уровень.</p>
<h2>Как пользоваться</h2>
<p>Выбери категорию в правом меню или используй поиск. Нажми на вакансию — увидишь полное описание и контакт работодателя. Все объявления ведут напрямую в Telegram-канал-источник. Регистрация не нужна — доступ ко всей базе бесплатный.</p>`
const DESCRIPTION =
  'Актуальные вакансии в digital: маркетинг, дизайн, SMM, аналитика, контент. Удалённая работа и офис. Обновление из Telegram-каналов ежедневно.'

interface Props {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const page = Math.min(Math.max(1, parseInt(pageParam || '1', 10) || 1), 500)
  const canonical = page === 1 ? `${BASE_URL}/vacancies` : `${BASE_URL}/vacancies?page=${page}`
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: TITLE,
      description:
        'Актуальные вакансии в digital: маркетинг, дизайн, SMM, аналитика, контент. Удалённая работа и офис.',
      url: canonical,
      type: 'website',
    },
  }
}

export default async function VacanciesPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams
  const page = Math.min(Math.max(1, parseInt(pageParam || '1', 10) || 1), 500)
  const [{ posts, total, totalPages }, tags, stats] = await Promise.all([
    getPostsByTypePaginated('vacancy', page, 20),
    getTagsWithCounts(),
    getStats(),
  ])

  const base = `${BASE_URL}/vacancies`
  const prevUrl = page > 1 ? (page === 2 ? base : `${base}?page=${page - 1}`) : null
  const nextUrl = page < totalPages ? `${base}?page=${page + 1}` : null

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${BASE_URL}` },
      { '@type': 'ListItem', position: 2, name: 'Вакансии', item: `${BASE_URL}/vacancies` },
    ],
  }

  const collectionPageLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${BASE_URL}/vacancies#webpage`,
    name: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/vacancies`,
    numberOfItems: total,
    isPartOf: { '@id': `${BASE_URL}/#website` },
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
        type="vacancy"
        tags={tags}
        stats={stats}
        currentPage={page}
        totalPages={totalPages}
        total={total}
        seoHtml={page === 1 ? VACANCIES_SEO_HTML : undefined}
      />
    </>
  )
}
