import fs from 'fs'
import path from 'path'

/**
 * Статья, у которой есть версия в репозитории, обязана рендериться из неё.
 *
 * Пока приоритет был обратный, rezyume-smm-spetsialista отдавала на проде
 * июньскую версию из админки — при том что 14.08 её переписали по стандарту
 * v6.6, а следом было ещё два коммита правок. Ни одна из них на сайт не
 * попала. Статья при этом входит в treatment-группу эксперимента переписки,
 * то есть замер 13.09 сравнивал бы текст, которого никто не видел.
 */
const page = fs.readFileSync(
  path.join(process.cwd(), 'app', '(main)', 'articles', '[slug]', 'page.tsx'),
  'utf8'
)

describe('источник текста статьи', () => {
  it('ветка Payload включается только при отсутствии версии в репозитории', () => {
    const branch = page.match(/if \(payloadArticle && payloadArticle\.content([^)]*)\)/)
    expect(branch).not.toBeNull()
    expect(branch![1]).toContain('!mdxArticle')
  })

  it('обложка по-прежнему берётся из репозитория, если она там есть', () => {
    expect(page).toMatch(/mdxArticle\?\.imageUrl \?\? payloadImageUrl/)
  })

  it('заголовок и описание тоже берутся из репозитория', () => {
    // Иначе title придёт из админки, а текст ниже — из git: страница обещает
    // одно, а рассказывает другое.
    expect(page).toMatch(/if \(payloadArticle && !mdxForMeta\)/)
  })

  it('версия из репозитория читается до выбора ветки', () => {
    const mdxAt = page.indexOf('const mdxArticle = getArticleBySlug(slug)')
    const branchAt = page.indexOf('if (payloadArticle && payloadArticle.content')
    expect(mdxAt).toBeGreaterThan(-1)
    expect(branchAt).toBeGreaterThan(mdxAt)
  })
})
