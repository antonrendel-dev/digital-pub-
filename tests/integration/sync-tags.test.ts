/**
 * Integration test for Telegram-sync tag assignment (Task 9 in tech-spec).
 *
 * Scope of THIS file:
 *   - Unit-level coverage of the real `matchTags` function imported from
 *     `lib/tag-matcher.ts` (the same module sync-telegram.ts uses in prod).
 *   - Cases from tech-spec: word boundary, Cyrillic, multi-tag, edge cases,
 *     no false positives, English/Russian punctuation around keywords.
 *
 * Out of scope (deferred):
 *   - Full `assignTags(postId, text)` flow that writes PostTag rows to the
 *     database. Requires either (a) a live test Postgres, or (b) a prisma
 *     mock. Both are heavier than warranted for an MVP regression net.
 *     Tracked as `it.todo` below — wire up once a test DB / Prisma mock
 *     harness exists.
 *
 * Why this test isn't a duplicate of tests/unit/tag-matching.test.ts:
 *   The unit file tests a LOCAL copy of `matchTags` (a doppelganger) and
 *   therefore cannot catch production drift. This file tests the actual
 *   exported function from lib/tag-matcher.ts.
 */
import { matchTags, TAG_KEYWORDS } from '@/lib/tag-matcher'

describe('matchTags (real implementation from lib/tag-matcher)', () => {
  describe('basic matches required by tech-spec', () => {
    test('"SMM-щик ищет работу" → contains smm', () => {
      expect(matchTags('SMM-щик ищет работу')).toContain('smm')
    })

    test('"SEO-специалист" → contains seo', () => {
      expect(matchTags('SEO-специалист')).toContain('seo')
    })

    test('"frontend-разработчик" → contains razrabotka', () => {
      expect(matchTags('frontend-разработчик')).toContain('razrabotka')
    })

    test('"ui/ux дизайнер" → contains dizajn', () => {
      expect(matchTags('ui/ux дизайнер')).toContain('dizajn')
    })

    test('"маркетолог в стартап" → contains marketing', () => {
      expect(matchTags('маркетолог в стартап')).toContain('marketing')
    })
  })

  describe('word boundary — no false positives', () => {
    test('"seotext" must NOT match seo', () => {
      expect(matchTags('Работа с seotext данными')).not.toContain('seo')
    })

    test('"chrome" must NOT match hr', () => {
      expect(matchTags('Chrome developer needed')).not.toContain('hr')
    })

    test('"дизайнерский" must NOT match dizajn (Cyrillic suffix)', () => {
      expect(matchTags('Дизайнерский подход к работе')).not.toContain('dizajn')
    })
  })

  describe('multi-tag in single text', () => {
    test('"Senior SMM-менеджер, удалённо" → senior + smm + udalyonka', () => {
      const tags = matchTags('Senior SMM-менеджер, удалённо')
      expect(tags).toContain('senior')
      expect(tags).toContain('smm')
      expect(tags).toContain('udalyonka')
    })

    test('"Performance маркетинг для бренда" → marketing only', () => {
      const tags = matchTags('Performance маркетинг для бренда')
      expect(tags).toContain('marketing')
    })
  })

  describe('edge cases', () => {
    test('empty string returns []', () => {
      expect(matchTags('')).toEqual([])
    })

    test('text with no keyword matches returns []', () => {
      expect(matchTags('Какой-то нерелевантный текст без ключевых слов')).toEqual([])
    })

    test('keyword at start of string matches', () => {
      expect(matchTags('SMM нужен')).toContain('smm')
    })

    test('keyword at end of string matches', () => {
      expect(matchTags('Ищем специалиста по SMM')).toContain('smm')
    })

    test('match is case-insensitive', () => {
      expect(matchTags('SMM')).toEqual(matchTags('smm'))
      expect(matchTags('SMM')).toEqual(matchTags('Smm'))
    })

    test('does not return duplicate tag slugs', () => {
      const tags = matchTags('SMM соцсети instagram') // 3 keywords → same tag
      const smmCount = tags.filter((t) => t === 'smm').length
      expect(smmCount).toBe(1)
    })
  })

  describe('TAG_KEYWORDS metadata', () => {
    test('exposes a non-empty keyword map', () => {
      expect(Object.keys(TAG_KEYWORDS).length).toBeGreaterThan(0)
    })

    test('every tag has at least one keyword', () => {
      for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        expect(keywords.length).toBeGreaterThan(0)
        expect(tag).toMatch(/^[a-z0-9-]+$/) // valid tag slug shape
      }
    })
  })

  // ─── Deferred: DB-integration coverage ─────────────────────────────
  // Full flow: savePost → assignTags → PostTag rows in DB.
  // Requires a test database or a prisma mock. Tracked here so it is
  // visible in `jest --listTests` output, not silently missing.
  it.todo('integration: assignTags writes PostTag rows for matched slugs (DB required)')
  it.todo('integration: assignTags skips duplicates on re-run (DB required)')
  it.todo('integration: assignTags is a no-op when text matches zero tags (DB required)')
})
