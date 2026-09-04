import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  trailingSlash: false,
  compress: true,
  // «x-powered-by: Next.js, Payload» в каждом ответе — подсказка сканерам, пользы нет.
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['sanitize-html', 'next-mdx-remote'],
    staleTimes: {
      static: 30,
      dynamic: 0,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn4.telesco.pe',
      },
      {
        protocol: 'https',
        hostname: '*.telesco.pe',
      },
      {
        protocol: 'https',
        hostname: 'd-pub.ru',
      },
      {
        protocol: 'https',
        hostname: 'staging.d-pub.ru',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.d-pub.ru' }],
        destination: 'https://d-pub.ru/:path*',
        permanent: true,
      },
      // Задача 1: старый Payload URL /post/:slug → главная
      { source: '/post/:slug', destination: '/', permanent: true },
      // Обрезанный слаг статьи о портфолио: адрес проиндексирован и приводил
      // людей из поиска на 404 — 4 визита за квартал (Метрика, 90 дней, 01.09.2026).
      {
        source: '/articles/portfolio-smm-spetsialista-primery',
        destination: '/articles/portfolio-smm-spetsialista-primery-kejsov',
        permanent: true,
      },
      // Задача 2: /vacancies/other — нет отдельного раздела, редиректим на /vacancies
      { source: '/vacancies/other', destination: '/vacancies', permanent: true },
      { source: '/vacancies/other/', destination: '/vacancies', permanent: true },
      { source: '/vacancies/figma', destination: '/tools/figma', permanent: true },
      { source: '/vacancies/canva', destination: '/tools/canva', permanent: true },
      { source: '/vacancies/tilda', destination: '/tools/tilda', permanent: true },
      { source: '/vacancies/yandex-direct', destination: '/tools/yandex-direct', permanent: true },
      { source: '/vacancies/tablicy', destination: '/tools/tablicy', permanent: true },
      { source: '/vacancies/capcut', destination: '/tools/capcut', permanent: true },
      { source: '/vacancies/chatgpt', destination: '/tools/chatgpt', permanent: true },
      { source: '/vacancies/yandex-metrika', destination: '/tools/yandex-metrika', permanent: true },
      { source: '/vacancies/screaming-frog', destination: '/tools/screaming-frog', permanent: true },
      { source: '/vacancies/semrush', destination: '/tools/semrush', permanent: true },
      { source: '/vacancies/midjourney', destination: '/tools/midjourney', permanent: true },
      { source: '/vacancies/google-analytics', destination: '/tools/google-analytics', permanent: true },
      { source: '/vacancies/photoshop', destination: '/tools/photoshop', permanent: true },
      { source: '/vacancies/vk-ads', destination: '/tools/vk-ads', permanent: true },
      // WordPress не попал в этот список, когда его собирали, и две страницы
      // тянули один ключ «wordpress вакансии» (82/мес). Обе стояли за сотней,
      // при этом /vacancies/wordpress отдавала ноль вакансий: тег не наполнен,
      // внутренних ссылок на неё нет. Терять на редиректе нечего.
      { source: '/vacancies/wordpress', destination: '/tools/wordpress', permanent: true },
      // Две статьи отвечали на один интент «работа через телеграм» (241/мес):
      // одна в MDX, вторая в Payload. Ни одна не получила ни показа за 90 дней —
      // для дубля закономерно, поисковик не выбирает ни ту, ни другую. Остаётся
      // та, что в репозитории: длиннее, с 10 разделами против 7, и правится
      // через git. Вторая уходит в черновики, контент при этом не теряется.
      {
        source: '/articles/kak-najti-rabotu-v-digital-cherez-telegram',
        destination: '/articles/kak-nayti-rabotu-telegram-digital',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        // All public routes — excludes /admin to prevent CSP merging
        source: '/((?!admin).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' yandex.ru *.yandex.ru yandex.com *.yandex.com arsenkin.ru *.arsenkin.ru www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: yandex.ru *.yandex.ru *.yandex.net yandex.com *.yandex.com *.telesco.pe www.googletagmanager.com www.google-analytics.com",
              "connect-src 'self' yandex.ru *.yandex.ru *.yandex.net yandex.com *.yandex.com wss://mc.yandex.com wss://*.yandex.com www.google-analytics.com www.googletagmanager.com",
              "frame-src yandex.ru *.yandex.ru yandex.com *.yandex.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        // Admin panel — scoped CSP that allows Lexical editor web workers and iframes
        source: '/admin(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com data:",
              "img-src 'self' data: blob:",
              "connect-src 'self' ws://localhost:* wss://localhost:*",
              "frame-src 'self'",
              "frame-ancestors 'self'",
              "worker-src blob: 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig)
