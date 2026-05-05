import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        {/* Column 1: Brand */}
        <div className="footer-col">
          <div className="footer-brand">
            <Image src="/logo.png" alt="Диджитал Паб" width={36} height={36} />
            <span className="footer-brand-name">
              диджитал<em>паб</em>
            </span>
          </div>
          <p className="footer-slogan">Место, где встречаются хорошие люди</p>
          <div className="footer-desc-block">
            <p className="footer-desc">Вакансии и резюме из Telegram-каналов.</p>
            <p className="footer-desc">Находи быстро, откликайся легко.</p>
          </div>
        </div>

        {/* Column 2: Navigation */}
        <div className="footer-col">
          <div className="footer-heading">Навигация</div>
          <a href="/vacancies" className="footer-link">Вакансии</a>
          <a href="/resumes" className="footer-link">Резюме</a>
          <a href="/reviews" className="footer-link">Отзывы</a>
          <a href="/articles" className="footer-link">Статьи</a>
          <a href="/useful" className="footer-link">Полезное</a>
        </div>

        {/* Column 3: Social */}
        <div className="footer-col">
          <div className="footer-heading">Мы в соцсетях</div>
          <a href="https://t.me/web_vacancy" target="_blank" rel="noopener noreferrer" className="footer-link">
            Telegram
          </a>
          <a href="https://max.ru/join/TdAOrknpNtm20J92ke2oXJGoKA8OI_nH6GnQ5xtH2TQ" target="_blank" rel="noopener noreferrer" className="footer-link">
            Макс
          </a>
          <a href="https://vk.com/digital_pub_vacancies" target="_blank" rel="noopener noreferrer" className="footer-link">
            ВКонтакте
          </a>
        </div>

        {/* Column 4: For employers */}
        <div className="footer-col">
          <div className="footer-heading">Работодателям</div>
          <a href="https://t.me/resume_vac_bot" target="_blank" rel="noopener noreferrer" className="footer-link">
            Разместить вакансию
          </a>
          <a href="https://t.me/resume_vac_bot" target="_blank" rel="noopener noreferrer" className="footer-link">
            Реклама
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <div className="wrap footer-bottom-inner">
          <span>&copy; {new Date().getFullYear()} Диджитал Паб</span>
          <div className="footer-legal">
            <a href="/privacy" className="footer-legal-link">Политика конфиденциальности</a>
            <a href="/terms" className="footer-legal-link">Условия использования</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
