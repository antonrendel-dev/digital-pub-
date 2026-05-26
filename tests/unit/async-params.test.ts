import CategoryPage, { generateMetadata as categoryMeta } from '@/app/vacancies/[category]/page'
import VacancyPage, {
  generateMetadata as vacancySlugMeta,
} from '@/app/vacancies/[category]/[slug]/page'
import TagPage, { generateMetadata as resumesTagMeta } from '@/app/resumes/tag/[tagSlug]/page'
import ArticlePage, { generateMetadata as articlesMeta } from '@/app/articles/[slug]/page'
import PostPage, { generateMetadata as postMeta } from '@/app/post/[id]/page'
import { generateMetadata as vacanciesListingMeta } from '@/app/vacancies/page'
import { generateMetadata as resumesListingMeta } from '@/app/resumes/page'
import { getTagBySlug } from '@/lib/tags'
import { getPostBySlug, getPostById } from '@/lib/posts'
import { getArticleBySlug } from '@/lib/articles'

// next/navigation: notFound() throws a special error in tests
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

jest.mock('@/lib/tags', () => ({
  getTagBySlug: jest.fn().mockResolvedValue(null),
  getTagsWithCounts: jest.fn().mockResolvedValue([]),
  getPostsByTag: jest.fn().mockResolvedValue([]),
  getStats: jest.fn().mockResolvedValue({ total: 0, vacancies: 0, resumes: 0 }),
}))

jest.mock('@/lib/posts', () => ({
  getPostBySlug: jest.fn().mockResolvedValue(null),
  getPostsByType: jest.fn().mockResolvedValue([]),
  getPostById: jest.fn().mockResolvedValue(null),
  getPostsByTypePaginated: jest.fn().mockResolvedValue({ posts: [], total: 0, totalPages: 1 }),
}))

jest.mock('@/lib/articles', () => ({
  getArticleBySlug: jest.fn().mockReturnValue(null),
  getArticles: jest.fn().mockReturnValue([]),
  formatArticleDate: jest.fn().mockReturnValue(''),
}))

// next-mdx-remote/rsc uses React Server Components API — not available in jest node env
jest.mock('next-mdx-remote/rsc', () => ({
  __esModule: true,
  MDXRemote: () => null,
}))

// remark-gfm is ESM-only — mock to avoid transform issues in jest CommonJS context
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Helper: run an async function, return the error (or null if no error)
async function runSafe(fn: () => Promise<unknown>): Promise<Error | null> {
  try {
    await fn()
    return null
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

describe('Next.js 15 async params — page components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('category_page_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = await runSafe(() =>
      CategoryPage({ params: Promise.resolve({ category: 'smm' }) } as any)
    )
    // Must not throw TypeError (would indicate params was not awaited)
    expect(err).not.toBeInstanceOf(TypeError)
    // lib must be called with the resolved string value, not a Promise
    expect(jest.mocked(getTagBySlug)).toHaveBeenCalledWith('smm')
  })

  it('category_slug_page_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = await runSafe(() =>
      VacancyPage({ params: Promise.resolve({ category: 'smm', slug: 'test' }) } as any)
    )
    expect(err).not.toBeInstanceOf(TypeError)
    expect(jest.mocked(getPostBySlug)).toHaveBeenCalledWith('test')
  })

  it('resumes_tag_page_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = await runSafe(() => TagPage({ params: Promise.resolve({ tagSlug: 'smm' }) } as any))
    expect(err).not.toBeInstanceOf(TypeError)
    expect(jest.mocked(getTagBySlug)).toHaveBeenCalledWith('smm')
  })

  it('articles_slug_page_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = await runSafe(() =>
      ArticlePage({ params: Promise.resolve({ slug: 'test-slug' }) } as any)
    )
    expect(err).not.toBeInstanceOf(TypeError)
    expect(jest.mocked(getArticleBySlug)).toHaveBeenCalledWith('test-slug')
  })

  it('post_id_page_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = await runSafe(() => PostPage({ params: Promise.resolve({ id: '1' }) } as any))
    // id='1' → passes zod validation → getPostById(1) called
    expect(err).not.toBeInstanceOf(TypeError)
    expect(jest.mocked(getPostById)).toHaveBeenCalledWith(1)
  })
})

describe('Next.js 15 async params — generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('category_generate_metadata_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await categoryMeta({ params: Promise.resolve({ category: 'smm' }) } as any)
    expect(result).toHaveProperty('title')
    // Must call getTagBySlug with the resolved value, not undefined/Promise
    expect(jest.mocked(getTagBySlug)).toHaveBeenCalledWith('smm')
  })

  it('resumes_tag_generate_metadata_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resumesTagMeta({ params: Promise.resolve({ tagSlug: 'smm' }) } as any)
    expect(result).toHaveProperty('title')
    expect(jest.mocked(getTagBySlug)).toHaveBeenCalledWith('smm')
  })

  it('post_id_generate_metadata_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await postMeta({ params: Promise.resolve({ id: '1' }) } as any)
    expect(result).toHaveProperty('title')
    // id='1' passes zod, then getPostById(1) is called
    expect(jest.mocked(getPostById)).toHaveBeenCalledWith(1)
  })

  it('vacancy_slug_generate_metadata_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await vacancySlugMeta({
      params: Promise.resolve({ category: 'smm', slug: 'test-vacancy' }),
    } as any)
    expect(result).toHaveProperty('title')
    expect(jest.mocked(getPostBySlug)).toHaveBeenCalledWith('test-vacancy')
  })

  it('articles_slug_generate_metadata_awaits_params', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await articlesMeta({ params: Promise.resolve({ slug: 'test-article' }) } as any)
    expect(result).toHaveProperty('title')
    expect(jest.mocked(getArticleBySlug)).toHaveBeenCalledWith('test-article')
  })
})

describe('Next.js 15 async searchParams — listing pages generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('vacancies_listing_generate_metadata_awaits_searchparams', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await vacanciesListingMeta({
      searchParams: Promise.resolve({ page: '2' }),
    } as any)
    expect(result).toHaveProperty('title')
    expect((result.alternates as { canonical?: string })?.canonical).toContain('page=2')
  })

  it('resumes_listing_generate_metadata_awaits_searchparams', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resumesListingMeta({ searchParams: Promise.resolve({ page: '2' }) } as any)
    expect(result).toHaveProperty('title')
    expect((result.alternates as { canonical?: string })?.canonical).toContain('page=2')
  })
})
