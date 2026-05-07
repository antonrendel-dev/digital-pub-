import type { Metadata } from 'next'
import Link from 'next/link'
import PageShell from '@/components/PageShell'

export const metadata: Metadata = {
  title: 'Условия использования — Диджитал Паб',
  description: 'Условия использования сервиса Диджитал Паб.',
}

export default function TermsPage() {
  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
          <Link href="/" className="text-text-muted no-underline hover:text-accent transition-colors">Главная</Link>
          <span className="text-text-light">&rsaquo;</span>
          <span className="text-text-light">Условия использования</span>
        </div>

        <h1 className="text-2xl font-bold text-text tracking-tight mb-6">Условия использования</h1>

        <div className="bg-bg-card border border-border rounded-xl p-7 text-sm text-text-muted leading-relaxed space-y-4">
          <p>Дата последнего обновления: 1 мая 2026 года.</p>

          <h2 className="text-lg font-semibold text-text">1. Общие положения</h2>
          <p>Сервис Диджитал Паб (d-pub.ru) является агрегатором вакансий и резюме из публичных Telegram-каналов. Используя Сервис, вы соглашаетесь с настоящими Условиями.</p>

          <h2 className="text-lg font-semibold text-text">2. Контент</h2>
          <p>Вакансии и резюме, размещённые на Сервисе, получены из публичных Telegram-каналов. Администрация Сервиса не несёт ответственности за содержание объявлений, размещённых третьими лицами.</p>

          <h2 className="text-lg font-semibold text-text">3. Размещение объявлений</h2>
          <p>Для размещения вакансий и рекламы используйте нашего Telegram-бота: <a href="https://t.me/resume_vac_bot" className="text-accent underline" target="_blank" rel="noopener noreferrer">@resume_vac_bot</a>.</p>

          <h2 className="text-lg font-semibold text-text">4. Интеллектуальная собственность</h2>
          <p>Дизайн и структура Сервиса являются интеллектуальной собственностью Диджитал Паб. Копирование материалов допускается только со ссылкой на источник.</p>
        </div>
      </div>
    </PageShell>
  )
}
