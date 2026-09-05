import { ImageResponse } from 'next/og'
import {
  OG_SIZE,
  clampOgTitle,
  loadOgFonts,
  ogKindLabel,
  ogTitleFontSize,
  verifyOgSignature,
} from '@/lib/og'

// Node, а не edge: шрифты читаются с диска через fs.
export const runtime = 'nodejs'

// Роут читает request.url и потому динамический; кэш даёт сам ImageResponse
// заголовком Cache-Control: public, immutable, max-age=31536000 — подпись в
// URL делает картинку неизменяемой для этого адреса.

const BG = '#060e24'
const CARD = '#0f1c3a'
const ACCENT = '#ffcc3e'
const TEXT = '#ffffff'
const MUTED = '#8b93a7'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Рисуем только то, что подписал сам сайт: текст в query без подписи или с
  // чужой подписью — 404, иначе любой мог бы выпустить нашу карточку со своим
  // заголовком (S19). Подпись считается по сырым параметрам, как в ogImageUrl.
  const raw = {
    title: searchParams.get('title') ?? '',
    kind: searchParams.get('kind') ?? undefined,
    subtitle: searchParams.get('subtitle') ?? undefined,
  }
  if (!verifyOgSignature(raw, searchParams.get('sig'))) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }
  const title = clampOgTitle(raw.title)
  const kind = ogKindLabel(raw.kind ?? null)
  const subtitle = (raw.subtitle ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BG,
        padding: '56px 64px',
        fontFamily: 'DejaVu',
      }}
    >
      {/* Шапка: метка раздела и бренд */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: CARD,
            border: `2px solid ${ACCENT}`,
            borderRadius: 999,
            padding: '10px 26px',
            fontSize: 26,
            color: ACCENT,
            fontWeight: 700,
          }}
        >
          {kind}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: MUTED }}>d-pub.ru</div>
      </div>

      {/* Заголовок */}
      <div
        style={{
          display: 'flex',
          fontSize: ogTitleFontSize(title),
          lineHeight: 1.18,
          color: TEXT,
          fontWeight: 700,
          maxWidth: 1030,
        }}
      >
        {title}
      </div>

      {/* Подвал: акцентная линия и подпись */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{ display: 'flex', width: 140, height: 6, background: ACCENT, marginBottom: 22 }}
        />
        <div style={{ display: 'flex', fontSize: 28, color: MUTED }}>
          {subtitle || 'Вакансии и резюме из Telegram-каналов'}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: loadOgFonts() }
  )
}
