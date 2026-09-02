import JsonLd from '@/components/JsonLd'
import { HUB_FAQ, type HubKey } from '@/lib/hub-faq'

/**
 * Видимый раздел вопросов и FAQPage-разметка из одного массива.
 *
 * Компонент, а не копия блока в каждом хабе: пять страниц с одинаковой
 * вёрсткой разъедутся при первой же правке одной из них, а расхождение
 * текста и разметки — это ровно то нарушение, ради которого всё делается.
 */
export default function HubFaq({ hub }: { hub: HubKey }) {
  const items = HUB_FAQ[hub]
  if (!items?.length) return null

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        }}
      />
      <h2 className="text-lg font-semibold text-text mb-4">Частые вопросы</h2>
      <div className="space-y-4">
        {items.map(({ q, a }) => (
          <div key={q}>
            <h3 className="text-base font-semibold text-text mb-1">{q}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
