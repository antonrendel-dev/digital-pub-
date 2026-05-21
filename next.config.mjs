/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' yandex.ru *.yandex.ru yandex.com *.yandex.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: yandex.ru *.yandex.ru *.yandex.net yandex.com *.yandex.com *.telesco.pe",
              "connect-src 'self' yandex.ru *.yandex.ru *.yandex.net yandex.com *.yandex.com wss://mc.yandex.com wss://*.yandex.com",
              "frame-src yandex.ru *.yandex.ru yandex.com *.yandex.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
