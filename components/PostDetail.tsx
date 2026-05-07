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

      <div className="grid grid-cols-1 md:grid-cols-post-layout gap-6 items-start">
        {/* Main content */}
        <main className="min-w-0">
          <div className="bg-bg-card border border-border rounded-xl p-7 transition-colors duration-200">
            <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded bg-accent text-accent-text mb-3.5 tracking-wide">
              {typeLabel}
            </span>

            <h1 className="text-[22px] font-bold text-text tracking-tight leading-snug mb-2.5">{post.title}</h1>

            <div className="flex items-center gap-3 flex-wrap mb-3.5">
              {post.company && <span className="text-sm font-semibold text-text">{post.company}</span>}
              <span className="text-sm text-text-light ml-auto">{formatDate(post.createdAt)}</span>
            </div>

            {post.salary && (
              <div className="text-xl font-bold text-brand-green mb-5">{post.salary}</div>
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

            <div className="flex gap-2.5 flex-wrap">
              {tgLink ? (
                <a
                  href={tgLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-5 py-2.5 bg-accent hover:bg-accent-hover text-accent-text rounded-lg text-sm font-semibold no-underline transition-colors"
                >
                  {post.type === 'vacancy' ? 'Откликнуться в Telegram' : 'Написать в Telegram'}
                </a>
              ) : (
                <button className="inline-flex items-center px-5 py-2.5 bg-accent hover:bg-accent-hover text-accent-text rounded-lg text-sm font-semibold border-none cursor-pointer transition-colors">
                  {post.type === 'vacancy' ? 'Откликнуться' : 'Написать'}
                </button>
              )}
              <Link
                href={typeHref}
                className="inline-flex items-center px-4 py-2.5 border border-border bg-bg-card text-text-muted rounded-lg text-sm no-underline hover:border-accent hover:text-text transition-all"
              >
                &larr; Все {post.type === 'vacancy' ? 'вакансии' : 'резюме'}
              </Link>
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          {/* Info card */}
          <div className="bg-bg-card border border-border rounded-xl p-4.5 transition-colors duration-200">
            <div className="s-lbl mb-3">Информация</div>
            <div className="space-y-0">
              <div className="flex justify-between items-start gap-2 py-2 border-b border-border-light text-[12.5px]">
                <span className="text-text-light flex-shrink-0">Тип</span>
                <span className="text-text font-medium text-right">{typeLabel}</span>
              </div>
              {post.salary && (
                <div className="flex justify-between items-start gap-2 py-2 border-b border-border-light text-[12.5px]">
                  <span className="text-text-light flex-shrink-0">Зарплата</span>
                  <span className="text-brand-green font-bold text-right">{post.salary}</span>
                </div>
              )}
              {post.channelUsername && (
                <div className="flex justify-between items-start gap-2 py-2 border-b border-border-light text-[12.5px]">
                  <span className="text-text-light flex-shrink-0">Источник</span>
                  <span className="text-text font-medium text-right">@{post.channelUsername}</span>
                </div>
              )}
              <div className="flex justify-between items-start gap-2 py-2 text-[12.5px]">
                <span className="text-text-light flex-shrink-0">Опубликовано</span>
                <span className="text-text font-medium text-right">{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-4.5 transition-colors duration-200">
              <div className="s-lbl mb-3">Похожие</div>
              {related.map((r) => (
                <a
                  key={r.id}
                  href={r.slug ? `/vacancies/${r.slug}` : `/post/${r.id}`}
                  className="block py-2.5 border-b border-border-light last:border-none last:pb-0 no-underline group"
                >
                  <div className="text-[12.5px] text-text font-medium leading-snug mb-0.5 group-hover:text-accent transition-colors">
                    {r.title}
                  </div>
                  <div className="text-[11px] text-text-light">
                    {formatDateShort(r.createdAt)}
                    {r.salary && <> &middot; {r.salary}</>}
                  </div>
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
