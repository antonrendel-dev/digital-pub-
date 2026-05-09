import type { Metadata } from 'next'
import HomePage from '@/components/HomePage'
import { getPublishedPosts } from '@/lib/posts'
import { getStats, getTagsWithCounts } from '@/lib/tags'
import { getArticles, formatArticleDate } from '@/lib/articles'

export const metadata: Metadata = {
  title: 'Вакансии в маркетинге, дизайне и IT — Диджитал Паб',
  description: 'Агрегатор вакансий и резюме digital-специалистов из Telegram-каналов. SMM, аналитика, дизайн, маркетинг — новые предложения каждый день.',
  alternates: { canonical: 'https://d-pub.ru' },
  openGraph: {
    title: 'Вакансии в маркетинге, дизайне и IT — Диджитал Паб',
    description: 'Агрегатор вакансий и резюме digital-специалистов из Telegram-каналов. SMM, аналитика, дизайн, маркетинг — новые предложения каждый день.',
    url: 'https://d-pub.ru',
    type: 'website',
  },
}

export const revalidate = 300 // ISR: refresh every 5 minutes

export default async function Page() {
  const [posts, stats, tags] = await Promise.all([
    getPublishedPosts(),
    getStats(),
    getTagsWithCounts(),
  ])
  const articlesMeta = getArticles()
  const articles = articlesMeta.map((a) => ({
    title: a.title,
    slug: a.slug,
    date: formatArticleDate(a.publishedAt),
  }))
  const seoHtml = `<h2>Диджитал Паб — агрегатор вакансий и резюме digital-специалистов</h2>
<p><strong>Диджитал Паб</strong> — это ежедневно обновляемый агрегатор вакансий и резюме для специалистов digital-сферы. Мы собираем предложения из десятков профильных Telegram-каналов и публикуем их в удобном каталоге с фильтрами по специализации, формату работы и уровню.</p>

<h2>Какие вакансии вы найдёте</h2>
<p>На сайте представлены <a href="/vacancies">вакансии</a> по всем ключевым направлениям digital:</p>
<ul>
<li><a href="/vacancies/smm">SMM-менеджер</a> — ведение соцсетей, контент-планы, продвижение в Telegram, VK, Instagram</li>
<li><a href="/vacancies/seo">SEO-специалист</a> — поисковая оптимизация, аналитика, линкбилдинг</li>
<li><a href="/vacancies/dizajn">Дизайнер</a> — UI/UX, веб-дизайн, графика, баннеры</li>
<li><a href="/vacancies/marketing">Маркетолог</a> — digital-стратегия, performance, продуктовый маркетинг</li>
<li><a href="/vacancies/target">Таргетолог</a> — настройка рекламы в VK, Яндекс, Telegram Ads</li>
<li><a href="/vacancies/razrabotka">Разработчик</a> — frontend, backend, fullstack, Python, JavaScript</li>
<li><a href="/vacancies/analitika">Аналитик</a> — data-аналитик, бизнес-аналитик, веб-аналитика</li>
<li><a href="/vacancies/hr">HR-менеджер</a> — рекрутинг, HRBP, HR-аналитика в digital-компаниях</li>
</ul>

<h2>Формат работы</h2>
<p>Фильтруйте вакансии по удобному формату:</p>
<ul>
<li><a href="/vacancies/udalyonka">Удалённая работа</a> — полностью remote-позиции из любой точки</li>
<li><a href="/vacancies/ofis">Работа в офисе</a> — вакансии в Москве, Санкт-Петербурге и регионах</li>
<li><a href="/vacancies/gibrid">Гибридный формат</a> — совмещение офиса и удалёнки</li>
</ul>

<h2>Уровень специалиста</h2>
<p>Найдите вакансию своего уровня:</p>
<ul>
<li><a href="/vacancies/junior">Junior</a> — стартовые позиции для начинающих специалистов</li>
<li><a href="/vacancies/middle">Middle</a> — для специалистов с опытом 2-4 года</li>
<li><a href="/vacancies/senior">Senior</a> — экспертные позиции с высокой зарплатой</li>
</ul>

<h2>Резюме специалистов</h2>
<p>Работодатели могут найти кандидатов в разделе <a href="/resumes">резюме</a>. Здесь представлены анкеты маркетологов, дизайнеров, разработчиков, аналитиков и других digital-специалистов из Telegram-сообщества.</p>

<h2>Полезные материалы</h2>
<p>В разделе <a href="/articles">статьи</a> мы публикуем обзоры зарплат, советы по составлению резюме, гайды по поиску работы и развитию карьеры в digital-сфере. Все материалы основаны на актуальных данных рынка труда 2026 года.</p>`

  return <HomePage posts={posts} stats={stats} articles={articles} tags={tags} seoHtml={seoHtml} />
}
