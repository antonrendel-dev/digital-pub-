'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { MergedArticle } from '@/lib/articles'
import { formatArticleDate } from '@/lib/articles'

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="3" width="16" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="1" y="7.75" width="16" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="1" y="12.5" width="16" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  )
}

function ArticleCardGrid({ article }: { article: MergedArticle }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="block bg-bg-card border border-border rounded-xl overflow-hidden no-underline hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
    >
      <div className="aspect-[16/9] w-full bg-gradient-to-br from-blue-100 to-blue-50 overflow-hidden">
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            width={480}
            height={270}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="opacity-20">
              <rect x="4" y="8" width="32" height="24" rx="3" stroke="#3B82F6" strokeWidth="2" />
              <path
                d="M4 26l9-8 6 5 5-4 12 10"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="28" cy="16" r="3" stroke="#3B82F6" strokeWidth="2" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {article.tags.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full whitespace-nowrap">
              {article.tags[0]}
            </span>
          )}
          <span className="text-xs text-text-light">
            {article.publishedAt ? formatArticleDate(article.publishedAt) : ''}
          </span>
        </div>
        <h2 className="text-base font-semibold text-text mb-1.5 line-clamp-2 leading-snug">
          {article.title}
        </h2>
        <p className="text-sm text-text-muted line-clamp-2">{article.description}</p>
        <div className="mt-3 text-xs text-amber-600 font-medium">Читать &rarr;</div>
      </div>
    </Link>
  )
}

function ArticleCardList({ article }: { article: MergedArticle }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="block bg-bg-card border border-border rounded-xl p-5 no-underline hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="w-full md:w-44 h-28 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50">
          {article.imageUrl && (
            <Image
              src={article.imageUrl}
              alt={article.title}
              width={176}
              height={112}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {article.tags.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full whitespace-nowrap">
                {article.tags[0]}
              </span>
            )}
            <span className="text-xs text-text-light">
              {article.publishedAt ? formatArticleDate(article.publishedAt) : ''}
            </span>
          </div>
          <h2 className="text-base font-semibold text-text mb-1.5 line-clamp-2">{article.title}</h2>
          <p className="text-sm text-text-muted line-clamp-2">{article.description}</p>
          <div className="mt-3 text-sm text-amber-600 font-medium">Читать &rarr;</div>
        </div>
      </div>
    </Link>
  )
}

export default function ArticlesGrid({ articles }: { articles: MergedArticle[] }) {
  const [view, setView] = useState<'grid' | 'list'>('grid')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-text-muted">{articles.length} материалов</span>
        <div className="flex items-center gap-1 p-1 bg-bg-card border border-border rounded-lg">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer border-none ${
              view === 'grid'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text bg-transparent'
            }`}
            aria-label="Плиточный вид"
          >
            <GridIcon />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer border-none ${
              view === 'list'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text bg-transparent'
            }`}
            aria-label="Списочный вид"
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article) => (
            <ArticleCardGrid key={`${article.source}-${article.slug}`} article={article} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCardList key={`${article.source}-${article.slug}`} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
