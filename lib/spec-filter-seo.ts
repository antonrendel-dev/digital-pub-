import { SPEC_FILTER_SEO_PART1 } from './spec-filter-seo-part1'
import { SPEC_FILTER_SEO_PART2 } from './spec-filter-seo-part2'

export interface SpecFilterContent {
  seoText: string
  faqItems: Array<{ question: string; answer: string }>
}

export const SPEC_FILTER_SEO: Record<string, SpecFilterContent> = {
  ...SPEC_FILTER_SEO_PART1,
  ...SPEC_FILTER_SEO_PART2,
}

export function getSpecFilterSeo(specSlug: string, filterSlug: string): SpecFilterContent | null {
  return SPEC_FILTER_SEO[`${specSlug}-${filterSlug}`] ?? null
}
