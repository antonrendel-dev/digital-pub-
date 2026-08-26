import sharp from 'sharp'
import { writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../public/images/posts')

const articles = [
  {
    slug: 'seo-specialist-2026-navyki-zarplata',
    label: 'SEO-специалист',
    sub: 'навыки · зарплата · 2026',
    accent: '#10b981',
    dark: '#064e3b',
    icon: 'search',
  },
  {
    slug: 'professiya-veb-analitik-2026',
    label: 'Веб-аналитик',
    sub: 'профессия · инструменты · 2026',
    accent: '#3b82f6',
    dark: '#1e3a8a',
    icon: 'chart',
  },
  {
    slug: 'hr-menedzher-digital-agentstvo-najm',
    label: 'HR в digital',
    sub: 'найм · агентство · 2026',
    accent: '#8b5cf6',
    dark: '#4c1d95',
    icon: 'people',
  },
  {
    slug: 'kak-nayti-rabotu-smm-menedzheru-2026',
    label: 'SMM-менеджер',
    sub: 'как найти работу · 2026',
    accent: '#ec4899',
    dark: '#831843',
    icon: 'smm',
  },
  {
    slug: 'stoimost-uslug-frilansera-digital-2026',
    label: 'Фриланс в digital',
    sub: 'прайс · услуги · 2026',
    accent: '#f59e0b',
    dark: '#78350f',
    icon: 'money',
  },
  {
    slug: 'zarplaty-digital-marketing-2026',
    label: 'Зарплаты в digital',
    sub: 'маркетинг · все профессии · 2026',
    accent: '#eab308',
    dark: '#713f12',
    icon: 'salary',
  },
  {
    slug: 'rezyume-targetologa-shablon-2026',
    label: 'Резюме таргетолога',
    sub: 'шаблон · примеры · 2026',
    accent: '#ef4444',
    dark: '#7f1d1d',
    icon: 'target',
  },
  {
    slug: 'udalennaya-rabota-digital-2026',
    label: 'Удалёнка в digital',
    sub: 'как найти оффер · 2026',
    accent: '#06b6d4',
    dark: '#164e63',
    icon: 'remote',
  },
  {
    slug: 'gde-iskat-vakansii-dizajnera-2026',
    label: 'Вакансии дизайнера',
    sub: 'UI/UX · веб · графика · 2026',
    accent: '#6366f1',
    dark: '#312e81',
    icon: 'design',
  },
  {
    slug: 'nejroseti-dlya-marketologa-2026',
    label: 'ИИ для маркетолога',
    sub: 'нейросети · навыки · 2026',
    accent: '#a855f7',
    dark: '#581c87',
    icon: 'ai',
  },
]

const icons = {
  search: `
    <rect x="320" y="140" width="60" height="60" fill="currentColor"/>
    <rect x="300" y="160" width="20" height="20" fill="currentColor"/>
    <rect x="380" y="160" width="20" height="20" fill="currentColor"/>
    <rect x="320" y="200" width="60" height="20" fill="currentColor"/>
    <rect x="370" y="220" width="20" height="20" fill="currentColor"/>
    <rect x="390" y="240" width="20" height="20" fill="currentColor"/>
    <rect x="410" y="260" width="20" height="20" fill="currentColor"/>`,
  chart: `
    <rect x="280" y="240" width="20" height="60" fill="currentColor"/>
    <rect x="310" y="200" width="20" height="100" fill="currentColor"/>
    <rect x="340" y="160" width="20" height="140" fill="currentColor"/>
    <rect x="370" y="180" width="20" height="120" fill="currentColor"/>
    <rect x="400" y="140" width="20" height="160" fill="currentColor"/>
    <rect x="430" y="220" width="20" height="80" fill="currentColor"/>
    <rect x="270" y="300" width="200" height="10" fill="currentColor"/>`,
  people: `
    <rect x="290" y="150" width="40" height="40" fill="currentColor"/>
    <rect x="280" y="190" width="60" height="80" fill="currentColor"/>
    <rect x="380" y="150" width="40" height="40" fill="currentColor"/>
    <rect x="370" y="190" width="60" height="80" fill="currentColor"/>
    <rect x="335" y="130" width="40" height="40" fill="currentColor" opacity="0.5"/>
    <rect x="325" y="170" width="60" height="80" fill="currentColor" opacity="0.5"/>`,
  smm: `
    <rect x="280" y="140" width="160" height="120" fill="currentColor" opacity="0.3"/>
    <rect x="280" y="140" width="160" height="10" fill="currentColor"/>
    <rect x="280" y="140" width="10" height="120" fill="currentColor"/>
    <rect x="430" y="140" width="10" height="120" fill="currentColor"/>
    <rect x="280" y="250" width="160" height="10" fill="currentColor"/>
    <rect x="310" y="220" width="20" height="20" fill="currentColor"/>
    <rect x="340" y="220" width="20" height="20" fill="currentColor"/>
    <rect x="370" y="220" width="20" height="20" fill="currentColor"/>
    <rect x="300" y="275" width="20" height="40" fill="currentColor"/>
    <rect x="380" y="275" width="20" height="40" fill="currentColor"/>
    <rect x="280" y="315" width="160" height="10" fill="currentColor"/>`,
  money: `
    <rect x="300" y="130" width="120" height="160" fill="currentColor" opacity="0.2"/>
    <rect x="300" y="130" width="120" height="10" fill="currentColor"/>
    <rect x="300" y="280" width="120" height="10" fill="currentColor"/>
    <rect x="300" y="130" width="10" height="160" fill="currentColor"/>
    <rect x="410" y="130" width="10" height="160" fill="currentColor"/>
    <rect x="340" y="150" width="40" height="10" fill="currentColor"/>
    <rect x="350" y="160" width="20" height="10" fill="currentColor"/>
    <rect x="330" y="170" width="60" height="10" fill="currentColor"/>
    <rect x="330" y="210" width="60" height="10" fill="currentColor"/>
    <rect x="320" y="220" width="80" height="10" fill="currentColor"/>
    <rect x="350" y="230" width="20" height="40" fill="currentColor"/>`,
  salary: `
    <rect x="270" y="300" width="180" height="10" fill="currentColor"/>
    <rect x="280" y="140" width="20" height="160" fill="currentColor"/>
    <rect x="280" y="140" width="40" height="20" fill="currentColor"/>
    <rect x="330" y="180" width="20" height="120" fill="currentColor"/>
    <rect x="330" y="180" width="40" height="20" fill="currentColor"/>
    <rect x="380" y="220" width="20" height="80" fill="currentColor"/>
    <rect x="380" y="220" width="40" height="20" fill="currentColor"/>
    <text x="289" y="340" font-family="monospace" font-size="14" fill="currentColor" opacity="0.7">₽ · $ · €</text>`,
  target: `
    <circle cx="360" cy="220" r="80" fill="none" stroke="currentColor" stroke-width="10"/>
    <circle cx="360" cy="220" r="55" fill="none" stroke="currentColor" stroke-width="10"/>
    <circle cx="360" cy="220" r="30" fill="currentColor"/>
    <rect x="355" y="135" width="10" height="25" fill="currentColor"/>
    <rect x="355" y="270" width="10" height="25" fill="currentColor"/>
    <rect x="420" y="215" width="25" height="10" fill="currentColor"/>
    <rect x="275" y="215" width="25" height="10" fill="currentColor"/>`,
  remote: `
    <rect x="280" y="160" width="160" height="110" fill="currentColor" opacity="0.2"/>
    <rect x="280" y="160" width="160" height="10" fill="currentColor"/>
    <rect x="280" y="160" width="10" height="110" fill="currentColor"/>
    <rect x="430" y="160" width="10" height="110" fill="currentColor"/>
    <rect x="280" y="260" width="160" height="10" fill="currentColor"/>
    <rect x="340" y="270" width="40" height="20" fill="currentColor"/>
    <rect x="310" y="290" width="100" height="10" fill="currentColor"/>
    <rect x="310" y="180" width="100" height="10" fill="currentColor" opacity="0.5"/>
    <rect x="310" y="200" width="80" height="10" fill="currentColor" opacity="0.5"/>
    <rect x="310" y="220" width="90" height="10" fill="currentColor" opacity="0.5"/>
    <rect x="310" y="240" width="60" height="10" fill="currentColor" opacity="0.5"/>`,
  design: `
    <rect x="280" y="140" width="100" height="100" fill="currentColor" opacity="0.3"/>
    <rect x="280" y="140" width="100" height="10" fill="currentColor"/>
    <rect x="280" y="140" width="10" height="100" fill="currentColor"/>
    <rect x="370" y="140" width="10" height="100" fill="currentColor"/>
    <rect x="280" y="230" width="100" height="10" fill="currentColor"/>
    <rect x="340" y="175" width="30" height="30" fill="currentColor"/>
    <rect x="340" y="260" width="120" height="80" fill="currentColor" opacity="0.3"/>
    <rect x="340" y="260" width="120" height="10" fill="currentColor"/>
    <rect x="340" y="260" width="10" height="80" fill="currentColor"/>
    <rect x="450" y="260" width="10" height="80" fill="currentColor"/>
    <rect x="340" y="330" width="120" height="10" fill="currentColor"/>`,
  ai: `
    <rect x="310" y="150" width="100" height="100" fill="currentColor" opacity="0.2"/>
    <rect x="310" y="150" width="100" height="10" fill="currentColor"/>
    <rect x="310" y="150" width="10" height="100" fill="currentColor"/>
    <rect x="400" y="150" width="10" height="100" fill="currentColor"/>
    <rect x="310" y="240" width="100" height="10" fill="currentColor"/>
    <rect x="335" y="175" width="20" height="20" fill="currentColor"/>
    <rect x="365" y="175" width="20" height="20" fill="currentColor"/>
    <rect x="335" y="210" width="50" height="10" fill="currentColor"/>
    <rect x="250" y="195" width="60" height="10" fill="currentColor"/>
    <rect x="410" y="195" width="60" height="10" fill="currentColor"/>
    <rect x="360" y="250" width="10" height="30" fill="currentColor"/>
    <rect x="330" y="280" width="60" height="20" fill="currentColor"/>`,
}

function makeSvg(art) {
  const icon = icons[art.icon] || icons.chart
  const labelLen = art.label.length
  const fontSize = labelLen > 14 ? 36 : 42
  const subFontSize = 18

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="450" viewBox="0 0 900 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="${art.dark}"/>
    </linearGradient>
    <linearGradient id="stripe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${art.accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${art.accent}" stop-opacity="0.03"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${art.accent}" stroke-width="0.3" opacity="0.2"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="900" height="450" fill="url(#bg)"/>
  <rect width="900" height="450" fill="url(#grid)"/>

  <!-- Left stripe -->
  <rect x="0" y="0" width="500" height="450" fill="url(#stripe)"/>

  <!-- Accent bar -->
  <rect x="0" y="0" width="6" height="450" fill="${art.accent}"/>

  <!-- Pixel icon area (right side) -->
  <g fill="${art.accent}" color="${art.accent}">
    ${icon}
  </g>

  <!-- Text area (left side) -->
  <text x="52" y="180" font-family="'Courier New', monospace" font-size="13" fill="${art.accent}" opacity="0.7" letter-spacing="3">D-PUB.RU / СТАТЬЯ</text>

  <text x="48" y="${240}" font-family="'Arial Black', Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="#f8fafc" letter-spacing="-1">
    ${escapeXml(art.label)}
  </text>

  <text x="50" y="286" font-family="'Courier New', monospace" font-size="${subFontSize}" fill="${art.accent}" opacity="0.85">
    ${escapeXml(art.sub)}
  </text>

  <!-- Bottom line -->
  <rect x="0" y="430" width="900" height="2" fill="${art.accent}" opacity="0.4"/>
  <text x="50" y="446" font-family="monospace" font-size="11" fill="#64748b">Диджитал Паб — агрегатор вакансий digital-специалистов</text>
</svg>`
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function generate(art) {
  const outPath = join(OUT_DIR, `${art.slug}.webp`)
  if (existsSync(outPath)) {
    console.log(`⏭  skip ${art.slug}.webp (exists)`)
    return
  }

  const svg = makeSvg(art)
  await sharp(Buffer.from(svg))
    .resize(900, 450)
    .webp({ quality: 88 })
    .toFile(outPath)

  console.log(`✅ ${art.slug}.webp`)
}

;(async () => {
  console.log(`\nГенерирую обложки для ${articles.length} статей...\n`)
  for (const art of articles) {
    await generate(art)
  }
  console.log('\nГотово!\n')
})()
