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
              <Image
                src="/logo.png"
                alt="Диджитал Паб"
                width={36}
                height={36}
                className="rounded-lg"
                style={{ objectFit: 'contain' }}
              />
              <span className="font-semibold text-text logo-brand">
                диджитал<em>паб</em>
              </span>
            </div>
            <p className="text-sm text-text-muted mt-2">Место, где встречаются хорошие люди</p>
            <p className="text-xs text-text-light mt-1">
              Вакансии и резюме из Telegram-каналов. Находи быстро, откликайся легко.
            </p>
          </div>

          {/* Nav */}
          <div>
            <div className="text-sm font-semibold text-text-muted mb-3">Навигация</div>
            <div className="space-y-2">
              <Link
                href="/vacancies"
                className="block text-sm text-text-light no-underline hover:text-text transition-colors"
              >
                Вакансии
              </Link>
              <Link
                href="/resumes"
                className="block text-sm text-text-light no-underline hover:text-text transition-colors"
              >
                Резюме
              </Link>
              <Link
                href="/articles"
                className="block text-sm text-text-light no-underline hover:text-text transition-colors"
              >
                Статьи
              </Link>
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="text-sm font-semibold text-text-muted mb-3">Мы в соцсетях</div>
            <div className="flex items-center gap-3">
              <a
                href="https://t.me/+69rdOEDrfvgyMDMy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="text-text-light hover:text-brand-tg transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.16 13.947l-2.954-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.982.612z" />
                </svg>
              </a>
              <a
                href="https://max.ru/join/TdAOrknpNtm20J92ke2oXJGoKA8OI_nH6GnQ5xtH2TQ"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Макс"
                className="text-text-light hover:text-brand-mx transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                  <path
                    d="M7 9.5C7 8.12 8.12 7 9.5 7h5C15.88 7 17 8.12 17 9.5v3c0 1.38-1.12 2.5-2.5 2.5H13l-2.5 2v-2H9.5C8.12 15 7 13.88 7 12.5v-3z"
                    fill="white"
                  />
                </svg>
              </a>
              <a
                href="https://vk.com/digital_pub_vacancies"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ВКонтакте"
                className="text-text-light hover:text-brand-vk transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                  <path
                    d="M18.1 8.2h-1.85a.42.42 0 0 0-.37.22s-.74 1.36-.98 1.82c-.64 1.22-1.04.84-1.04.28V8.63a.62.62 0 0 0-.62-.62H11.84a1.12 1.12 0 0 0-.99.46s.71-.12.71.84c0 .24.01.92.02 1.49a.41.41 0 0 1-.72.28 12.13 12.13 0 0 1-1.41-2.56.39.39 0 0 0-.36-.23H7.4a.29.29 0 0 0-.27.39c.5 1.41 2.7 5.78 5.19 5.78h1.06a.42.42 0 0 0 .42-.42v-.64a.41.41 0 0 1 .69-.3l1.27 1.19a.62.62 0 0 0 .42.17h1.66c.8 0 .8-.56.36-.99-.31-.3-1.42-1.48-1.42-1.48a.58.58 0 0 1-.04-.75c.36-.47.95-1.25 1.2-1.58.34-.45.96-1.42.11-1.42z"
                    fill="white"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Employers */}
          <div>
            <div className="text-sm font-semibold text-text-muted mb-3">Работодателям</div>
            <div className="space-y-2">
              <a
                href="https://t.me/resume_vac_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-text-light no-underline hover:text-text transition-colors"
              >
                Разместить вакансию
              </a>
              <a
                href="https://t.me/resume_vac_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-text-light no-underline hover:text-text transition-colors"
              >
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
            <Link
              href="/privacy"
              className="text-text-light no-underline hover:text-text-muted transition-colors"
            >
              Политика конфиденциальности
            </Link>
            <Link
              href="/terms"
              className="text-text-light no-underline hover:text-text-muted transition-colors"
            >
              Условия использования
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
