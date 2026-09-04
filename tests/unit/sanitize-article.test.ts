import fs from 'fs'
import path from 'path'
import { sanitizeArticleHtml } from '../../lib/sanitize'

describe('sanitizeArticleHtml — контент Payload-статей', () => {
  it('режет обработчики, svg, javascript: и скрипты', () => {
    expect(sanitizeArticleHtml('<p>x</p><img src="x" onerror="alert(1)">')).toBe('<p>x</p>')
    expect(sanitizeArticleHtml('<svg onload="alert(1)"><circle/></svg>')).toBe('')
    expect(sanitizeArticleHtml('<a href="javascript:alert(1)">y</a>')).toBe('<a>y</a>')
    // Обфускации схемы: пробелы, перенос, сущности, регистр — режет launder до проверки.
    expect(sanitizeArticleHtml('<a href="//evil.example/x">y</a>')).toBe('<a>y</a>')
    for (const href of [
      ' javascript:alert(1)',
      'java\nscript:alert(1)',
      '&#106;avascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'data:text/html,x',
      'vbscript:x',
    ]) {
      expect(sanitizeArticleHtml(`<a href="${href}">y</a>`)).toBe('<a>y</a>')
    }
    expect(sanitizeArticleHtml('<script>alert(1)</script><p>ok</p>')).toBe('<p>ok</p>')
    expect(sanitizeArticleHtml('<p style="background:url(x)" onclick="a()">t</p>')).toBe('<p>t</p>')
  })

  it('сохраняет таблицу, картинки из /images/, /uploads/ и по https, цитату, код', () => {
    const html =
      '<h2>Заголовок</h2><table><thead><tr><th colspan="2">a</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>' +
      '<img src="/images/posts/x.webp" alt="x" width="700" loading="lazy" />' +
      '<img src="/uploads/media-1.webp" alt="из медиатеки Payload" />' +
      '<img src="https://cdn.example.com/y.png" alt="y" />' +
      '<blockquote>цитата</blockquote><pre><code>x = 1</code></pre><hr /><figure><figcaption>п</figcaption></figure>'
    expect(sanitizeArticleHtml(html)).toBe(html)
  })

  it('картинка с чужим относительным путём или data: выбрасывается целиком', () => {
    expect(sanitizeArticleHtml('<p>a</p><img src="../x.png" alt="x">')).toBe('<p>a</p>')
    expect(sanitizeArticleHtml('<img src="data:image/png;base64,AAAA" alt="x">')).toBe('')
    expect(sanitizeArticleHtml('<img src="//evil.example/x.png" alt="x">')).toBe('')
  })

  it('ссылки получают rel=noopener noreferrer, http(s) остаются', () => {
    expect(sanitizeArticleHtml('<a href="https://d-pub.ru/vacancies" title="t">v</a>')).toBe(
      '<a href="https://d-pub.ru/vacancies" title="t" rel="noopener noreferrer">v</a>'
    )
  })

  it('страница Payload-статьи рендерит контент только через санитайзер', () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), 'app/(main)/articles/[slug]/page.tsx'),
      'utf8'
    )
    expect(page).toMatch(/const safeContent = sanitizeArticleHtml\(payloadArticle\.content\)/)
    expect(page).toMatch(/__html: safeContent \}/)
    expect(page).toMatch(/chars=\{safeContent\.replace/)
    expect(page).not.toMatch(/__html: payloadArticle\.content \}/)
  })
})
