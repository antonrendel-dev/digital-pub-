import type { Metadata } from 'next'
import HomePage from '@/components/HomePage'
import { getPublishedPosts } from '@/lib/posts'
import { getStats, getTagsWithCounts } from '@/lib/tags'
import { getArticles, formatArticleDate } from '@/lib/articles'

export const metadata: Metadata = {
  title: 'Вакансии в маркетинге, дизайне и IT — Диджитал Паб',
  description:
    'Агрегатор вакансий и резюме digital-специалистов из Telegram-каналов. SMM, аналитика, дизайн, маркетинг — новые предложения каждый день.',
  alternates: { canonical: 'https://d-pub.ru' },
  openGraph: {
    title: 'Вакансии в маркетинге, дизайне и IT — Диджитал Паб',
    description:
      'Агрегатор вакансий и резюме digital-специалистов из Telegram-каналов. SMM, аналитика, дизайн, маркетинг — новые предложения каждый день.',
    url: 'https://d-pub.ru',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [posts, stats, tags] = await Promise.all([
    getPublishedPosts().catch(() => [] as Awaited<ReturnType<typeof getPublishedPosts>>),
    getStats().catch(() => ({ vacancyCount: 0, resumeCount: 0, companyCount: 0, newToday: 0 })),
    getTagsWithCounts().catch(() => [] as Awaited<ReturnType<typeof getTagsWithCounts>>),
  ])
  const articlesMeta = getArticles()
  const articles = articlesMeta.map((a) => ({
    title: a.title,
    slug: a.slug,
    date: formatArticleDate(a.publishedAt),
  }))
  const seoHtml = `<h2>Работа в digital: вакансии и резюме для маркетологов, дизайнеров и IT-специалистов</h2>
<p>Диджитал Паб собирает <a href="/vacancies">вакансии</a> и <a href="/resumes">резюме</a> из десятков специализированных Telegram-каналов в одном удобном каталоге. Больше не нужно мониторить каждый канал вручную — мы автоматически агрегируем предложения и обновляем базу несколько раз в день. Все объявления структурированы по категориям, уровню и формату работы.</p>

<h2>Какие вакансии вы найдёте на Диджитал Паб</h2>
<ul>
<li><strong><a href="/vacancies/smm">SMM-вакансии</a></strong> — SMM-менеджер, SMM-специалист, контент-менеджер для социальных сетей. Ежемесячно более 1 600 человек ищут работу в SMM.</li>
<li><strong><a href="/vacancies/marketing">Маркетинг</a></strong> — интернет-маркетолог, продуктовый маркетолог, руководитель отдела маркетинга, CRM-маркетолог. Вакансии маркетинг — один из самых востребованных запросов в digital-найме.</li>
<li><strong><a href="/vacancies/dizajn">Дизайн</a></strong> — графический дизайнер, UI/UX-дизайнер, веб-дизайнер, моушн-дизайнер. Вакансии дизайнер удалённо особенно популярны — более 3 000 запросов в месяц.</li>
<li><strong><a href="/vacancies/seo">SEO</a></strong> — SEO-специалист, линкбилдер, контент-стратег. Продвижение сайтов остаётся ключевым каналом привлечения трафика для бизнеса.</li>
<li><strong><a href="/vacancies/target">Таргетированная реклама</a></strong> — таргетолог ВКонтакте, специалист по контекстной рекламе, PPC-менеджер.</li>
<li><strong><a href="/vacancies/analitika">Аналитика</a></strong> — веб-аналитик, продуктовый аналитик, data-аналитик в маркетинге.</li>
<li><strong><a href="/vacancies/razrabotka">Разработка</a></strong> — фронтенд и бэкенд разработчики, WordPress-специалисты, верстальщики для digital-агентств.</li>
<li><strong><a href="/vacancies/hr">HR</a></strong> — рекрутер, HRBP, HR-аналитик в digital-компаниях.</li>
</ul>

<h2>Все форматы работы в одном каталоге</h2>
<p>Удалённая работа в digital становится стандартом рынка. На Диджитал Паб вы можете фильтровать вакансии по формату занятости:</p>
<ul>
<li><strong><a href="/vacancies/udalyonka">Удалёнка</a></strong> — полностью дистанционная работа из любой точки. Самый популярный формат среди digital-специалистов.</li>
<li><strong><a href="/vacancies/ofis">Офис</a></strong> — работа в штате компании или digital-агентства с присутствием в офисе.</li>
<li><strong><a href="/vacancies/gibrid">Гибрид</a></strong> — совмещение офисных и удалённых дней, гибкий график.</li>
</ul>

<h2>Уровни специалистов</h2>
<p>Мы размечаем вакансии по грейдам, чтобы вы быстро находили подходящие предложения:</p>
<ul>
<li><strong><a href="/vacancies/junior">Junior</a></strong> — начинающие специалисты и стажёры. Вакансии SMM без опыта, помощник дизайнера, junior-маркетолог.</li>
<li><strong><a href="/vacancies/middle">Middle</a></strong> — специалисты с опытом от 1 до 3 лет. Основной пул вакансий digital-рынка.</li>
<li><strong><a href="/vacancies/senior">Senior</a></strong> — старшие специалисты, тимлиды и руководители направлений.</li>
</ul>

<h2>Резюме digital-специалистов</h2>
<p>Раздел <a href="/resumes">резюме</a> предназначен для работодателей и HR-менеджеров. Здесь собраны анкеты специалистов из профильных Telegram-каналов: маркетологи, дизайнеры, SEO-специалисты, таргетологи, аналитики и разработчики. Каждое резюме содержит описание опыта, навыков и контактные данные для связи.</p>

<h2>Почему Диджитал Паб</h2>
<ul>
<li><strong>Актуальность</strong> — вакансии обновляются автоматически из Telegram-каналов несколько раз в день.</li>
<li><strong>Фокус на digital</strong> — только профильные вакансии в маркетинге, дизайне, аналитике и IT. Никакого информационного шума.</li>
<li><strong>Удобная навигация</strong> — фильтры по категориям, формату работы и грейду позволяют найти нужное за секунды.</li>
<li><strong>Бесплатно</strong> — полный доступ к базе вакансий и резюме без регистрации и ограничений.</li>
</ul>

<p>Читайте наши <a href="/articles">статьи</a> о карьере в digital — обзоры зарплат, советы по составлению резюме и гайды по поиску работы для маркетологов, дизайнеров и аналитиков.</p>`

  return <HomePage posts={posts} stats={stats} articles={articles} tags={tags} seoHtml={seoHtml} />
}
