import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = [
  'h2',
  'h3',
  'h4',
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'b',
  'i',
  'a',
  'br',
  'span',
]

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'rel'],
  span: ['class'],
}

export function sanitizeSeoHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['https', 'http'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
        },
      }),
    },
  })
}

/**
 * Контент Payload-статей (поле `content`, HTML). До 04.09.2026 вставлялся в
 * страницу без очистки — единственное такое место на сайте. Пишут его admin и
 * agent (завод от имени админа), CSP с unsafe-inline от inline-XSS не защищает:
 * инъекция в текст модели или утечка пароля админа превращалась бы в stored XSS.
 *
 * Allowlist шире SEO-текста: статьям нужны таблицы, картинки, цитаты, код.
 * Картинки — только https и относительные из двух своих каталогов: /images/
 * (статика из репозитория) и /uploads/ (медиатека Payload, public/uploads).
 * Ссылки — только http(s). Атрибуты id/class не пропускаются намеренно: id
 * на произвольных элементах при CSP с unsafe-inline — DOM clobbering через
 * window[id]; якорные ссылки внутри статьи таким образом не работают.
 */
const ARTICLE_TAGS = [
  'h2',
  'h3',
  'h4',
  'p',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'strong',
  'em',
  'b',
  'i',
  'code',
  'pre',
  'blockquote',
  'br',
  'hr',
  'figure',
  'figcaption',
]

const ARTICLE_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  td: ['colspan'],
  th: ['colspan'],
}

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ARTICLE_TAGS,
    allowedAttributes: ARTICLE_ATTRIBUTES,
    allowedSchemes: ['https', 'http'],
    allowedSchemesByTag: { img: ['https', 'http'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        // rel — только у ссылки, которая переживёт проверку схемы: transformTags идёт
        // до naughtyHref, иначе у вырезанного javascript: остался бы голый rel.
        attribs: /^\s*(?:https?:\/\/|\/(?![/\\]))/i.test(attribs.href ?? '')
          ? { ...attribs, rel: 'noopener noreferrer' }
          : attribs,
      }),
      img: (tagName, attribs) => {
        const src = attribs.src ?? ''
        const ok = /^https?:\/\//i.test(src) || /^\/(?:images|uploads)\//.test(src)
        return { tagName, attribs: ok ? attribs : { ...attribs, src: '' } }
      },
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
  })
}
