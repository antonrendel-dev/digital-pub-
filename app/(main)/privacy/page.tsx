import type { Metadata } from 'next'
import Link from 'next/link'
import PageShell from '@/components/PageShell'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — Диджитал Паб',
  description: 'Политика конфиденциальности сервиса Диджитал Паб.',
}

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
          <Link
            href="/"
            className="text-text-muted no-underline hover:text-accent transition-colors"
          >
            Главная
          </Link>
          <span className="text-text-light">&rsaquo;</span>
          <span className="text-text-light">Политика конфиденциальности</span>
        </div>

        <h1 className="text-2xl font-bold text-text tracking-tight mb-6">
          Политика конфиденциальности
        </h1>

        <div className="bg-bg-card border border-border rounded-xl p-7 text-sm text-text-muted leading-relaxed space-y-4">
          <p>Дата последнего обновления: 1 мая 2026 года.</p>

          <h2 className="text-lg font-semibold text-text">1. Общие положения</h2>
          <p>
            Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных
            данных пользователей сервиса Диджитал Паб (далее — Сервис), доступного по адресу
            d-pub.ru.
          </p>

          <h2 className="text-lg font-semibold text-text">2. Какие данные мы собираем</h2>
          <p>
            Сервис является агрегатором публичных данных из Telegram-каналов. Мы не требуем
            регистрации и не собираем персональные данные пользователей. Мы используем стандартные
            средства веб-аналитики для анализа посещаемости.
          </p>

          <h2 className="text-lg font-semibold text-text">3. Cookies</h2>
          <p>
            Сервис может использовать cookies для сохранения пользовательских настроек (например,
            выбранная тема оформления). Эти cookies не содержат персональных данных.
          </p>

          <h2 className="text-lg font-semibold text-text">4. Контактная информация</h2>
          <p>
            По вопросам, связанным с обработкой данных, вы можете обратиться через Telegram:{' '}
            <a
              href="https://t.me/resume_vac_bot"
              className="text-accent underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              @resume_vac_bot
            </a>
            .
          </p>
        </div>
      </div>
    </PageShell>
  )
}
