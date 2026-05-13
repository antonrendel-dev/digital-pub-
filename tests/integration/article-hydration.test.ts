/**
 * Regression: client-side hydration crash on article pages (commit 038afbb).
 *
 * Root cause: MDX content contains GitHub-flavored markdown tables
 *   (`| col | col |\n|---|---|\n| a | b |`). Without remark-gfm in the
 *   MDX pipeline, these are rendered to plaintext on the server but the
 *   client expects table markup → hydration mismatch crash.
 *
 * Fix: `remark-gfm` is passed via `options.mdxOptions.remarkPlugins`
 *   to `<MDXRemote>` in `app/articles/[slug]/page.tsx`.
 *
 * This file pins three things so the fix cannot silently regress:
 *   1. `remark-gfm` stays a runtime dependency in package.json.
 *   2. `app/articles/[slug]/page.tsx` imports remarkGfm and passes it
 *      into `<MDXRemote options>`.
 *   3. Real articles on disk DO contain markdown tables — otherwise
 *      the bug surface area is zero and the regression test is moot.
 *
 * A full client-side hydration assertion requires a live Next.js server
 * and is covered as an E2E test (see TODO in tests/e2e/articles.spec.ts).
 * Smoke coverage here is enough to catch the most common regression
 * vectors at unit-test cost (no server, no DB, no browser).
 */
import fs from 'fs'
import path from 'path'

const REPO_ROOT = path.join(__dirname, '..', '..')
const ARTICLE_PAGE = path.join(REPO_ROOT, 'app', 'articles', '[slug]', 'page.tsx')
const PACKAGE_JSON = path.join(REPO_ROOT, 'package.json')
const ARTICLES_DIR = path.join(REPO_ROOT, 'content', 'articles')

describe('article hydration regression (commit 038afbb)', () => {
  it('remark-gfm is a runtime dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'))
    expect(pkg.dependencies).toHaveProperty('remark-gfm')
    // Major version 4+ — matches the API used in app/articles/[slug]/page.tsx
    const version: string = pkg.dependencies['remark-gfm']
    expect(version).toMatch(/^\^?[4-9]\./)
  })

  it('article page imports remarkGfm and passes it to MDXRemote remarkPlugins', () => {
    const src = fs.readFileSync(ARTICLE_PAGE, 'utf-8')

    // Import is present
    expect(src).toMatch(/import\s+remarkGfm\s+from\s+['"]remark-gfm['"]/)

    // remarkGfm is wired into MDXRemote via remarkPlugins
    // (regex is intentionally loose around whitespace/quote style)
    expect(src).toMatch(/remarkPlugins\s*:\s*\[\s*remarkGfm/)

    // MDXRemote actually consumes the options object
    expect(src).toMatch(/<MDXRemote[\s\S]*options\s*=/)
  })

  it('at least one real article contains a markdown table — the regression surface', () => {
    // If no article has a table, the bug class is dead and this test
    // should fail loudly so we know to retire the regression check.
    const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'))
    expect(files.length).toBeGreaterThan(0)

    // GFM table = pipe row followed by a separator row of dashes.
    const tablePattern = /^\|.+\|\s*\n\|[\s\-:|]+\|/m

    const filesWithTables = files.filter((f) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf-8')
      return tablePattern.test(raw)
    })

    expect(filesWithTables.length).toBeGreaterThan(0)
  })

  // TODO(E2E): full hydration assertion requires a running Next dev/prod
  // server. Add a Playwright spec that:
  //   1. navigates to an article with a table
  //   2. registers page.on('pageerror') and page.on('console') listeners
  //   3. asserts no "Hydration failed" / "Text content does not match"
  //   4. asserts <table>, <thead>, <tbody> are present in the rendered DOM
  it.todo('E2E: article with table renders without hydration errors')
})
