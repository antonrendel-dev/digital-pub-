export const FILTER_CHIPS = [
  'Удалёнка',
  'SMM',
  'SEO',
  'Дизайн',
  'Маркетинг',
  'Менеджер',
  'Таргет',
] as const

export type FilterChip = (typeof FILTER_CHIPS)[number]
