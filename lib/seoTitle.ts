export const SITE_NAME = 'Диджитал Паб'

// Бренд к <title> дописывает шаблон в app/(main)/layout.tsx. Если он уже есть
// в исходной строке — в выдаче получается «... | Диджитал Паб | Диджитал Паб».
// Актуально для данных из Payload: их правят в админке, где шаблона не видно.
export function stripBrandSuffix(title: string): string {
  return title.replace(/\s*[|–—-]\s*Диджитал Паб\s*$/i, '').trim()
}
