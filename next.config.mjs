import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  trailingSlash: false,
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
      { source: '/vacancies/figma', destination: '/tools/figma', permanent: true },
      { source: '/vacancies/canva', destination: '/tools/canva', permanent: true },
      { source: '/vacancies/tilda', destination: '/tools/tilda', permanent: true },
      { source: '/vacancies/yandex-direct', destination: '/tools/yandex-direct', permanent: true },
      { source: '/vacancies/tablicy', destination: '/tools/tablicy', permanent: true },
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
