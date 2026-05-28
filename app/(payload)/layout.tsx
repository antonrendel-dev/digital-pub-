/* Custom Payload layout — provides a SYNCHRONOUS html/body shell via cookies(),
 * so Next.js uses it as the document shell for admin routes instead of
 * (main)/layout.tsx's shell. Payload init (initReq) runs async inside Suspense,
 * keeping TTFB fast while avoiding nested <html> elements.
 *
 * Replaces the auto-generated layout that uses Payload's RootLayout (which
 * renders its own async html/body causing double-html and blank admin screen).
 */
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions } from '@payloadcms/next/layouts'
import { ProgressBar, RootProvider } from '@payloadcms/ui'
import { getClientConfig } from '@payloadcms/ui/utilities/getClientConfig'
import { cookies as nextCookies } from 'next/headers.js'
import { applyLocaleFiltering } from 'payload/shared'
import React, { Suspense } from 'react'

import { importMap } from './admin/importMap.js'
import './custom.scss'

// Internal Payload utilities — stable across minor versions
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { initReq } from '@payloadcms/next/dist/utilities/initReq.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getNavPrefs } from '@payloadcms/next/dist/elements/Nav/getNavPrefs.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { NestProviders } from '@payloadcms/next/dist/layouts/Root/NestProviders.js'

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

// Async component: full Payload init, renders body content without html/body
async function PayloadBodyContent({
  children,
  serverFunction: sf,
}: {
  children: React.ReactNode
  serverFunction: ServerFunctionClient
}) {
  const {
    cookies,
    languageCode,
    permissions,
    req,
    req: {
      payload: { config: payloadConfig },
    },
  } = await initReq({ configPromise: config, importMap, key: 'RootLayout' })

  const supportedLanguages: Record<
    string,
    { translations?: { general?: { thisLanguage?: string } } }
  > = payloadConfig.i18n?.supportedLanguages || {}
  const languageOptions = Object.entries(supportedLanguages).reduce(
    (acc: { label: string; value: string }[], [language, languageConfig]) => {
      if (Object.keys(supportedLanguages).includes(language)) {
        acc.push({
          label: languageConfig?.translations?.general?.thisLanguage ?? language,
          value: language,
        })
      }
      return acc
    },
    []
  )

  async function switchLanguageServerAction(lang: string): Promise<void> {
    'use server'
    const cookieStore = await nextCookies()
    cookieStore.set({
      name: `${payloadConfig.cookiePrefix || 'payload'}-lng`,
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      value: lang,
    })
  }

  const navPrefs = await getNavPrefs(req)

  const clientConfig = getClientConfig({
    config: payloadConfig,
    i18n: req.i18n,
    importMap,
    user: req.user,
  })

  await applyLocaleFiltering({ clientConfig, config: payloadConfig, req })

  // Determine theme for RootProvider (mirrors Payload's getRequestTheme logic)
  const acceptedThemes = ['dark', 'light'] as const
  type AdminTheme = (typeof acceptedThemes)[number]
  let theme: AdminTheme = 'light'
  const adminTheme = payloadConfig.admin?.theme
  if (adminTheme !== 'all' && acceptedThemes.includes(adminTheme as AdminTheme)) {
    theme = adminTheme as AdminTheme
  } else {
    const themeVal = (cookies as Map<string, string>).get(
      `${payloadConfig.cookiePrefix || 'payload'}-theme`
    )
    if (themeVal && acceptedThemes.includes(themeVal as AdminTheme)) {
      theme = themeVal as AdminTheme
    }
  }

  const providers = payloadConfig.admin?.components?.providers

  return (
    <>
      <RootProvider
        config={clientConfig}
        dateFNSKey={req.i18n.dateFNSKey}
        fallbackLang={payloadConfig.i18n.fallbackLanguage}
        isNavOpen={navPrefs?.open ?? true}
        languageCode={languageCode}
        languageOptions={languageOptions}
        locale={req.locale}
        permissions={req.user ? permissions : null}
        serverFunction={sf}
        switchLanguageServerAction={switchLanguageServerAction}
        theme={theme}
        translations={req.i18n.translations}
        user={req.user}
      >
        <ProgressBar />
        {Array.isArray(providers) && providers.length > 0 ? (
          <NestProviders
            importMap={req.payload.importMap}
            providers={providers}
            serverProps={{
              i18n: req.i18n,
              payload: req.payload,
              permissions,
              user: req.user,
            }}
          >
            {children}
          </NestProviders>
        ) : (
          children
        )}
      </RootProvider>
      <div id="portal" />
    </>
  )
}

// Synchronous html/body shell — theme from cookies keeps data-theme correct.
// Having a synchronous html/body in this layout prevents Next.js from using
// (main)/layout.tsx's html as the shell for admin routes.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await nextCookies()
  const themeCookie = cookieStore.get('payload-theme')?.value
  const theme = themeCookie === 'dark' ? 'dark' : 'light'

  return (
    <html data-theme={theme} dir="LTR" lang="en" suppressHydrationWarning>
      <head>
        <style>{`@layer payload-default, payload;`}</style>
      </head>
      <body>
        <Suspense fallback={null}>
          <PayloadBodyContent serverFunction={serverFunction}>{children}</PayloadBodyContent>
        </Suspense>
      </body>
    </html>
  )
}
