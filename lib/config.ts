export const SOCIAL_CHANNELS = {
  telegram: { subscribers: '14 200 подписчиков' },
  max: { subscribers: '6 800 подписчиков' },
  vk: { subscribers: '9 300 подписчиков' },
} as const

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
