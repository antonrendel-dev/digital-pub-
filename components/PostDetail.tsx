import Image from 'next/image'
import Link from 'next/link'
import {
  cleanDescription,
  formatDateShort,
  getPrimaryCategorySlug,
  type FeedPost,
} from '@/lib/postUtils'
import { buildVacancyH1 } from '@/lib/vacancy-meta'
import { getVacancyContextBlock } from '@/lib/vacancy-context-block'
import type { CategoryStats } from '@/lib/tags'
import type { InterviewQuestion } from '@/lib/interview-questions'
import TagsSidebar, { TagData } from './TagsSidebar'

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface PostDetailProps {
  post: FeedPost
  related: FeedPost[]
  categorySlug?: string
  categoryName?: string
  allTags?: TagData[]
  categoryStats?: CategoryStats
  roleDescription?: string | null
  interviewQuestions?: InterviewQuestion[]
}

export default function PostDetail({
  post,
  related,
  categorySlug,
  categoryName,
  allTags,
  categoryStats,
  roleDescription,
  interviewQuestions,
}: PostDetailProps) {
  const typeLabel = post.type === 'vacancy' ? 'Вакансия' : 'Резюме'
  const typeHref = post.type === 'vacancy' ? '/vacancies' : '/resumes'

  // Determine primary category for breadcrumb
  const primaryTag = post.tags?.find((t) => t.tagType === 'specialization') || post.tags?.[0]
  const effectiveCategorySlug = categorySlug || getPrimaryCategorySlug(post)
  const effectiveCategoryName =
    categoryName || primaryTag?.name || (post.type === 'vacancy' ? 'Вакансии' : 'Резюме')

  const postTagSlugs = new Set(post.tags?.map((t) => t.slug).filter(Boolean) ?? [])
  const tagSlugArr = Array.from(postTagSlugs) as string[]
  const contextBlock =
    post.type === 'vacancy'
      ? getVacancyContextBlock({
          tagSlugs: tagSlugArr,
          salary: post.salary,
          company: post.company,
          createdAt: post.createdAt,
          description: post.description,
        })
      : null
  const workFormat = postTagSlugs.has('udalyonka')
    ? 'Удалённо'
    : postTagSlugs.has('gibrid')
      ? 'Гибрид'
      : postTagSlugs.has('ofis')
        ? 'В офисе'
        : null

  const tgLink =
    post.channelUsername && post.telegramMessageId
      ? `https://t.me/${post.channelUsername}/${post.telegramMessageId}`
      : null

  // Local paths cause the optimizer to fetch via http:// which nginx 301-redirects to https → empty body → 400.
  // Converting to absolute https:// makes the optimizer fetch directly via HTTPS → 200.
  const resolvedImageUrl = post.imageUrl?.startsWith('/')
    ? `${process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'}${post.imageUrl}`
    : post.imageUrl

  const paragraphs = cleanDescription(post.description ?? '')
    .split('\n')
    .filter((l) => l.trim())

  return (
    <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
        <Link href="/" className="text-text-muted no-underline hover:text-accent transition-colors">
          Главная
        </Link>
        <span className="text-text-light">&rsaquo;</span>
        <Link
          href={typeHref}
          className="text-text-muted no-underline hover:text-accent transition-colors"
        >
          {post.type === 'vacancy' ? 'Вакансии' : 'Резюме'}
        </Link>
        {post.type === 'vacancy' && (
          <>
            <span className="text-text-light">&rsaquo;</span>
            <Link
              href={`/vacancies/${effectiveCategorySlug}`}
              className="text-text-muted no-underline hover:text-accent transition-colors"
            >
              {effectiveCategoryName}
            </Link>
          </>
        )}
        <span className="text-text-light">&rsaquo;</span>
        <span className="text-text-light truncate">{buildVacancyH1(post, categoryName)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* Main content */}
        <main className="min-w-0">
          <div className="bg-bg-card border border-border rounded-xl p-6 md:p-8 transition-colors duration-200">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full mb-4">
              {typeLabel}
            </span>

            <h1 className="text-2xl md:text-3xl font-bold text-text mb-3">
              {buildVacancyH1(post, categoryName)}
            </h1>

            <div className="flex items-center gap-3 flex-wrap mb-3.5">
              {post.company && (
                <span className="text-sm font-semibold text-text">{post.company}</span>
              )}
              <span className="text-sm text-text-light ml-auto">
                {formatDateLong(post.createdAt)}
              </span>
            </div>

            {post.salary && (
              <div className="inline-block bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-6">
                <span className="text-lg font-bold text-green-700">{post.salary}</span>
              </div>
            )}

            {resolvedImageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <Image
                  src={resolvedImageUrl}
                  alt={post.title}
                  width={800}
                  height={400}
                  className="w-full h-auto max-h-[300px] object-cover block"
                  priority
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
            )}

            <div className="text-sm leading-7 text-text-muted mb-7">
              {paragraphs.map((line, i) => (
                <p key={i} className="mb-2.5 last:mb-0">
                  {line}
                </p>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
              {tgLink ? (
                <a
                  href={tgLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-gray-900 font-semibold text-sm px-6 py-3 rounded-full no-underline transition-colors min-h-[44px]"
                >
                  Откликнуться в Telegram
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ) : (
                <button className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-gray-900 font-semibold text-sm px-6 py-3 rounded-full border-none cursor-pointer transition-colors min-h-[44px]">
                  {post.type === 'vacancy' ? 'Откликнуться' : 'Написать'}
                </button>
              )}
              <Link
                href={typeHref}
                className="inline-flex items-center justify-center bg-bg-card border border-border hover:bg-border-light text-text-muted font-medium text-sm px-6 py-3 rounded-full no-underline transition-colors min-h-[44px]"
              >
                &larr; Все {post.type === 'vacancy' ? 'вакансии' : 'резюме'}
              </Link>
            </div>
          </div>

          {/* Role description */}
          {roleDescription && post.type === 'vacancy' && (
            <div className="bg-bg-card border border-border rounded-xl p-6 md:p-8 mt-4 transition-colors duration-200">
              <h2 className="text-lg font-bold text-text mb-3">О роли {effectiveCategoryName}</h2>
              <p className="text-sm leading-7 text-text-muted">{roleDescription}</p>
            </div>
          )}

          {/* Interview questions */}
          {interviewQuestions && interviewQuestions.length > 0 && post.type === 'vacancy' && (
            <div className="bg-bg-card border border-border rounded-xl p-6 md:p-8 mt-4 transition-colors duration-200">
              <h2 className="text-lg font-bold text-text mb-5">Вопросы на интервью</h2>
              <div className="space-y-3">
                {interviewQuestions.map((item, i) => (
                  <details
                    key={i}
                    className="group border border-border rounded-lg overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer text-sm font-medium text-text hover:bg-bg-card transition-colors list-none">
                      <span>{item.question}</span>
                      <span className="text-text-muted shrink-0 group-open:rotate-180 transition-transform">
                        ▾
                      </span>
                    </summary>
                    <div className="px-4 pb-4 pt-2 text-sm text-text-muted leading-relaxed border-t border-border">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          {/* Info card */}
          <div className="bg-bg-card border border-border rounded-xl p-5 transition-colors duration-200">
            <h3 className="text-sm font-semibold text-text mb-4">Информация</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Тип</span>
                <span className="font-medium text-text">{typeLabel}</span>
              </div>
              {post.salary && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Зарплата</span>
                  <span className="font-medium text-green-600">{post.salary}</span>
                </div>
              )}
              {workFormat && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Формат</span>
                  <span className="font-medium text-text">{workFormat}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Опубликовано</span>
                <span className="font-medium text-text">{formatDateLong(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Context block: tips for applicant */}
          {contextBlock && (
            <div className="border-2 border-accent rounded-xl p-5 bg-bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💡</span>
                <h3 className="text-sm font-bold text-text">{contextBlock.heading}</h3>
              </div>
              <ul className="space-y-3">
                {contextBlock.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-text-muted leading-relaxed">
                    <span className="text-accent font-bold shrink-0 mt-0.5">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Market context: category stats */}
          {categoryStats && post.type === 'vacancy' && (
            <div className="bg-bg-card border border-border rounded-xl p-5 transition-colors duration-200">
              <h3 className="text-sm font-semibold text-text mb-4">Рынок категории</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Всего вакансий</span>
                  <span className="font-semibold text-text">{categoryStats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Новых за неделю</span>
                  <span className="font-semibold text-green-600">+{categoryStats.newThisWeek}</span>
                </div>
                {categoryStats.avgSalary && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Средняя зарплата</span>
                    <span className="font-semibold text-text">{categoryStats.avgSalary}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categories & Tags */}
          {allTags && (
            <TagsSidebar
              tags={allTags}
              activeSlug={effectiveCategorySlug}
              heading={post.type === 'resume' ? 'Резюме по категориям' : 'Категории и теги'}
              hrefFn={post.type === 'resume' ? (s) => `/resumes/tag/${s}` : undefined}
            />
          )}

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-5 transition-colors duration-200">
              <h3 className="text-sm font-semibold text-text mb-4">
                {post.type === 'resume' ? 'Похожие резюме' : 'Похожие вакансии'}
              </h3>
              <div className="space-y-4">
                {related.map((r) => {
                  const rCatSlug = getPrimaryCategorySlug(r)
                  return (
                    <Link
                      key={r.id}
                      href={
                        r.slug
                          ? `/${r.type === 'resume' ? 'resumes' : 'vacancies'}/${rCatSlug}/${r.slug}`
                          : `/post/${r.id}`
                      }
                      className="block no-underline group"
                    >
                      <div className="text-sm font-medium text-text-muted group-hover:text-text transition-colors">
                        {r.title}
                      </div>
                      <div className="text-xs text-text-light mt-0.5">
                        {r.company && <>{r.company} &middot; </>}
                        {r.salary || formatDateShort(r.createdAt)}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-sm font-semibold text-text mb-2">Вы работодатель?</div>
            <p className="text-xs text-text-muted mb-3">Разместите вакансию через нашего бота</p>
            <a
              href="https://t.me/resume_vac_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent hover:bg-accent-hover text-gray-900 font-semibold text-xs px-4 py-2 rounded-full transition no-underline"
            >
              Разместить вакансию
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}
