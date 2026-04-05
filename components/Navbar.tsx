export default function Navbar() {
  return (
    <nav>
      <div className="logo">
        диджитал<em>паб</em>
      </div>
      <div className="nav-links">
        <a href="/" className="on">
          Главная
        </a>
        <a href="/vacancies">Вакансии</a>
        <a href="/resumes">Резюме</a>
        <a href="/articles">Статьи</a>
      </div>
      <div className="nav-r">
        <button className="btn-g">Войти</button>
        <button className="btn-b">+ Разместить вакансию</button>
      </div>
    </nav>
  )
}
