import Link from 'next/link'
import { FeedPost } from '@/lib/posts'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  if (days < 7) return `${days} дня назад`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

interface PostDetailProps {
  post: FeedPost
  related: FeedPost[]
}

export default function PostDetail({ post, related }: PostDetailProps) {
  const typeLabel = post.type === 'vacancy' ? 'Вакансия' : 'Резюме'
  const typeHref = post.type === 'vacancy' ? '/vacancies' : '/resumes'

  const tgLink =
    post.channelUsername && post.telegramMessageId
      ? `https://t.me/${post.channelUsername}/${post.telegramMessageId}`
      : null

  const cleanText = (post.description ?? '')
    .replace(/@\w+/g, '')
    .replace(/Администрация не несет ответственност[^\n]*/gi, '')
    .replace(/Смотри вакансии →[^\n]*/gi, '')
  const paragraphs = cleanText.split('\n').filter((l) => l.trim())

  return (
    <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
        <Link href="/" className="text-text-muted no-underline hover:text-accent transition-colors">Главная</Link>
        <span className="text-text-light">&rsaquo;</span>
        <Link href={typeHref} className="text-text-muted no-underline hover:text-accent transition-colors">
          {post.type === 'vacancy' ? 'Вакансии' : 'Резюме'}
        </Link>
        <span className="text-text-light">&rsaquo;</span>
        <span className="text-text-light truncate">{post.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* Main content */}
        <main className="min-w-0">
          <div className="bg-bg-card border border-border rounded-xl p-6 md:p-8 transition-colors duration-200">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full mb-4">
              {typeLabel}
            </span>

            <h1 className="text-2xl md:text-3xl font-bold text-text mb-3">{post.title}</h1>

            <div className="flex items-center gap-3 flex-wrap mb-3.5">
              {post.company && <span className="text-sm font-semibold text-text">{post.company}</span>}
              <span className="text-sm text-text-light ml-auto">{formatDate(post.createdAt)}</span>
            </div>

            {post.salary && (
              <div className="inline-block bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-6">
                <span className="text-lg font-bold text-green-700">{post.salary}</span>
              </div>
            )}

            {post.imageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img src={post.imageUrl} alt={post.title} className="w-full h-auto max-h-[300px] object-cover block" />
              </div>
            )}

            <div className="text-sm leading-7 text-text-muted mb-7">
              {paragraphs.map((line, i) => (
                <p key={i} className="mb-2.5 last:mb-0">{line}</p>
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
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
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
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Формат</span>
                <span className="font-medium text-text">Удалённо</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Опубликовано</span>
                <span className="font-medium text-text">{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-5 transition-colors duration-200">
              <h3 className="text-sm font-semibold text-text mb-4">Похожие вакансии</h3>
              <div className="space-y-4">
                {related.map((r) => (
                  <a
                    key={r.id}
                    href={r.slug ? `/vacancies/${r.slug}` : `/post/${r.id}`}
                    className="block no-underline group"
                  >
                    <div className="text-sm font-medium text-text-muted group-hover:text-text transition-colors">
                      {r.title}
                    </div>
                    <div className="text-xs text-text-light mt-0.5">
                      {r.company && <>{r.company} &middot; </>}
                      {r.salary || formatDateShort(r.createdAt)}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 text-center">
            <div className="text-sm font-semibold text-text mb-2">Вы работодатель?</div>
            <p className="text-xs text-text-muted mb-3">Разместите вакансию через нашего бота</p>
            <a href="https://t.me/resume_vac_bot" target="_blank" rel="noopener noreferrer" className="inline-block bg-accent hover:bg-accent-hover text-gray-900 font-semibold text-xs px-4 py-2 rounded-full transition no-underline">Разместить вакансию</a>
          </div>
        </aside>
      </div>
    </div>
  )
}
