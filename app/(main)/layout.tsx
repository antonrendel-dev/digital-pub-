import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import MetrikaHit from '@/components/MetrikaHit'
import Footer from '@/components/Footer'
import '../globals.css'

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

const SITE_URL = 'https://d-pub.ru'
const SITE_NAME = 'Диджитал Паб'
const DEFAULT_DESCRIPTION =
  'Агрегатор вакансий и резюме digital-специалистов из Telegram-каналов. SMM, аналитика, дизайн, маркетинг — новые предложения каждый день.'

const YANDEX_METRIKA_ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || ''
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''
const IS_PRODUCTION = !process.env.PAYLOAD_PUSH_DB

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Диджитал Паб — вакансии и резюме в digital',
    template: '%s | Диджитал Паб',
  },
  description: DEFAULT_DESCRIPTION,
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '32x32' }, { url: '/logo.png' }],
    apple: '/logo.png',
  },
  robots: {
    index: IS_PRODUCTION,
    follow: IS_PRODUCTION,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Диджитал Паб — вакансии и резюме в digital',
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Диджитал Паб — агрегатор вакансий и резюме',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Диджитал Паб — вакансии и резюме в digital',
    description: DEFAULT_DESCRIPTION,
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
      ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION }
      : {}),
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  inLanguage: 'ru',
  publisher: {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
    },
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/vacancies?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={inter.variable}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <div className="flex flex-col min-h-screen">
        {children}
        <Footer />
      </div>

      {YANDEX_METRIKA_ID && (
        <>
          <Script id="yandex-metrika" strategy="afterInteractive">
            {`
              (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
              ym(${YANDEX_METRIKA_ID},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
            `}
          </Script>
          <Suspense>
            <MetrikaHit id={Number(YANDEX_METRIKA_ID)} />
          </Suspense>
        </>
      )}

      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer=window.dataLayer||[];
              function gtag(){dataLayer.push(arguments);}
              gtag('js',new Date());
              gtag('config','${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}
    </div>
  )
}
