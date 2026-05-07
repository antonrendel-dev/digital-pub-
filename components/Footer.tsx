import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-12 bg-bg-card border-t border-border transition-colors duration-200">
      <div className="max-w-wrap mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Image src="/logo.png" alt="Диджитал Паб" width={36} height={36} className="rounded-lg" style={{ objectFit: 'contain' }} />
              <span className="font-semibold text-text logo-brand">
                диджитал<em>паб</em>
              </span>
            </div>
            <p className="text-sm text-text-muted mt-2">Место, где встречаются хорошие люди</p>
            <p className="text-xs text-text-light mt-1">Вакансии и резюме из Telegram-каналов. Находи быстро, откликайся легко.</p>
          </div>

          {/* Nav */}
          <div>
            <div className="text-sm font-semibold text-text-muted mb-3">Навигация</div>
            <div className="space-y-2">
              <Link href="/vacancies" className="block text-sm text-text-light no-underline hover:text-text transition-colors">Вакансии</Link>
              <Link href="/resumes" className="block text-sm text-text-light no-underline hover:text-text transition-colors">Резюме</Link>
              <Link href="/articles" className="block text-sm text-text-light no-underline hover:text-text transition-colors">Статьи</Link>
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="text-sm font-semibold text-text-muted mb-3">Мы в соцсетях</div>
            <div className="flex items-center gap-3">
              <a href="https://t.me/web_vacancy" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-text-light hover:text-brand-tg transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.16 13.947l-2.954-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.982.612z" />
                </svg>
              </a>
              <a href="https://max.ru/join/TdAOrknpNtm20J92ke2oXJGoKA8OI_nH6GnQ5xtH2TQ" target="_blank" rel="noopener noreferrer" aria-label="Макс" className="text-text-light hover:text-brand-mx transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                  <path d="M7 9.5C7 8.12 8.12 7 9.5 7h5C15.88 7 17 8.12 17 9.5v3c0 1.38-1.12 2.5-2.5 2.5H13l-2.5 2v-2H9.5C8.12 15 7 13.88 7 12.5v-3z" fill="white" />
                </svg>
              </a>
              <a href="https://vk.com/digital_pub_vacancies" target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте" className="text-text-light hover:text-brand-vk transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                  <path d="M18.4 8.2h-2.07a.47.47 0 0 0-.41.24s-.82 1.52-1.09 2.03c-.71 1.37-1.17.94-1.17.31V8.55a.69.69 0 0 0-.69-.69h-1.55a1.24 1.24 0 0 0-1.1.51s.79-.13.79.93c0 .26.01 1.02.03 1.65a.46.46 0 0 1-.8.32A13.46 13.46 0 0 1 8.78 8.4a.43.43 0 0 0-.4-.25H6.64a.32.32 0 0 0-.3.43c.56 1.57 3.01 6.45 5.8 6.45h1.17a.47.47 0 0 0 .47-.47v-.71a.46.46 0 0 1 .77-.33l1.4 1.33a.69.69 0 0 0 .47.18h1.85c.89 0 .89-.62.4-1.1-.34-.33-1.57-1.63-1.57-1.63a.64.64 0 0 1-.05-.83c.4-.52 1.05-1.38 1.33-1.75.38-.5 1.06-1.57.12-1.57z" fill="white" />
                </svg>
              </a>
            </div>
          </div>

          {/* Employers */}
          <div>
            <div className="text-sm font-semibold text-text-muted mb-3">Работодателям</div>
            <div className="space-y-2">
              <a href="https://t.me/resume_vac_bot" target="_blank" rel="noopener noreferrer" className="block text-sm text-text-light no-underline hover:text-text transition-colors">
                Разместить вакансию
              </a>
              <a href="https://t.me/resume_vac_bot" target="_blank" rel="noopener noreferrer" className="block text-sm text-text-light no-underline hover:text-text transition-colors">
                Реклама
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border py-4">
        <div className="max-w-wrap mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-text-light">
          <span>&copy; {new Date().getFullYear()} Диджитал Паб</span>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <Link href="/privacy" className="text-text-light no-underline hover:text-text-muted transition-colors">Политика конфиденциальности</Link>
            <Link href="/terms" className="text-text-light no-underline hover:text-text-muted transition-colors">Условия использования</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
