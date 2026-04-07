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

  const paragraphs = (post.description ?? '').split('\n').filter((l) => l.trim())

  return (
    <div className="wrap post-wrap">
      {/* Breadcrumb */}
      <div className="post-breadcrumb">
        <a href="/">Главная</a>
        <span className="post-bc-sep">›</span>
        <a href={typeHref}>{post.type === 'vacancy' ? 'Вакансии' : 'Резюме'}</a>
        <span className="post-bc-sep">›</span>
        <span>{post.title}</span>
      </div>

      <div className="post-layout">
        {/* Main content */}
        <main className="post-main">
          <div className="post-card">
            {/* Type badge */}
            <div className="post-type-badge">{typeLabel}</div>

            <h1 className="post-title">{post.title}</h1>

            {/* Meta row */}
            <div className="post-meta-row">
              {post.company && <span className="post-company">{post.company}</span>}
              {post.channelUsername && (
                <span className="post-channel">@{post.channelUsername}</span>
              )}
              <span className="post-date">{formatDate(post.createdAt)}</span>
            </div>

            {post.salary && <div className="post-salary">{post.salary}</div>}

            {/* Full post text */}
            <div className="post-body">
              {paragraphs.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            {/* Actions */}
            <div className="post-actions">
              {tgLink ? (
                <a
                  href={tgLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="post-btn-primary"
                >
                  {post.type === 'vacancy' ? 'Откликнуться в Telegram' : 'Написать в Telegram'}
                </a>
              ) : (
                <button className="post-btn-primary">
                  {post.type === 'vacancy' ? 'Откликнуться' : 'Написать'}
                </button>
              )}
              <a href={typeHref} className="post-btn-secondary">
                ← Все {post.type === 'vacancy' ? 'вакансии' : 'резюме'}
              </a>
            </div>
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="post-sidebar">
          {/* Quick info card */}
          <div className="post-info-card">
            <div className="post-info-title">Информация</div>
            <div className="post-info-row">
              <span className="post-info-label">Тип</span>
              <span className="post-info-val">{typeLabel}</span>
            </div>
            {post.salary && (
              <div className="post-info-row">
                <span className="post-info-label">Зарплата</span>
                <span className="post-info-val post-info-salary">{post.salary}</span>
              </div>
            )}
            {post.channelUsername && (
              <div className="post-info-row">
                <span className="post-info-label">Источник</span>
                <span className="post-info-val">@{post.channelUsername}</span>
              </div>
            )}
            <div className="post-info-row">
              <span className="post-info-label">Опубликовано</span>
              <span className="post-info-val">{formatDate(post.createdAt)}</span>
            </div>
          </div>

          {/* Related posts */}
          {related.length > 0 && (
            <div className="post-related">
              <div className="s-lbl">Похожие</div>
              {related.map((r) => (
                <a key={r.id} href={`/post/${r.id}`} className="post-related-item">
                  <div className="post-related-title">{r.title}</div>
                  <div className="post-related-meta">
                    {formatDateShort(r.createdAt)}
                    {r.salary && <> · {r.salary}</>}
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
